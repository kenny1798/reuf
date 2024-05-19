const express = require('express');
const app = express();
const db = require('./models');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const port = parseInt(process.env.PORT, 10);
const {bookings, temp_bookings} = require('./models');
const {Server} = require("socket.io");
const { Client, LocalAuth } = require('whatsapp-web.js');
const http = require('http');
var cron = require('node-cron');
const crypto = require('crypto');
const server = http.createServer(app);

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({
    extended: true
}));

const YOUR_SECRET_KEY = `${process.env.BILLPLZ_X_KEY}`;
const YOUR_API_KEY = `${process.env.BILLPLZ_SECRET_KEY}`;
const YOUR_COLLECTION_ID = process.env.BILLPLZ_COLLECTION_ID;
const stringKey = btoa(`${process.env.BILLPLZ_SECRET_KEY}:`);

const serverOrigins = [process.env.REACT_SERVER, 'https://www.billplz-sandbox.com/'];
const io = new Server(server, {
  cors:{
      origin: serverOrigins, 
    credentials: true,
      methods: ["GET", "POST", "PUT"],
  }
});

cron.schedule('*/6 * * * *', () => {

});

app.get('/test', async (req,res) => {
  console.log(stringKey)

const test = async () => {
  let ress = await fetch('https://www.billplz-sandbox.com/api/v3/bills', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa('157857c7-4e52-40fa-b440-460d40a34ad3:')
    },
    body: 'collection_id=eimpoxep&description=Maecenas eu placerat ante.&email=api@billplz.com&name=Sara&amount=200&reference_1_label=Bank Code&reference_1=BP-FKR01&callback_url=http://192.168.1.7:3001/webhook/'
});

const json = ress.json()

return json;

 }
try{
const response = await test();
res.send(response.url)
}catch(err){
  console.log(err)
}

})




app.post('/booking', async (req,res) => {
const {name, phoneNumber, email, selectedDate, selectedSession, pax} = req.body;
const parsedPax = parseInt(pax, 10);
const slicedDate = selectedDate.slice(0,15);
const totalAmount = parsedPax * 100

try{
  if(!name || !email || !phoneNumber || !selectedDate || !selectedSession || !pax){
    res.json({error: 'Please fill up all details'})
  }else{
  const test = async () => {
    let response = await fetch('https://www.billplz-sandbox.com/api/v3/bills', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${stringKey}`
      },
      body: `collection_id=eimpoxep&description=Reserve on ${slicedDate} (${selectedSession}) for ${parsedPax} pax&email=${email}&mobile=${phoneNumber}&name=${name}&amount=${totalAmount}&callback_url=${process.env.THIS_SERVER}/billplz-callback/&redirect_url=${process.env.REACT_SERVER}/reserve-finish/`
  });

  const json = response.json()
  
  return json;  
  }

  try{
    const response = await test();
    console.log(response)
    if(response.error){
      const errMsg = response.error.message.join(", ");
      res.json({error: errMsg});
    }else{
      await temp_bookings.create({
        name: name,
        email: email,
        phoneNumber: phoneNumber,
        bookingDate: selectedDate,
        bookingTime: selectedSession,
        bookingPax: parsedPax,
        billId: response.id
      }).then(() => {
        res.json({url: response.url})
      })
    }
    }catch(err){
      res.json({error: err.message})
    }
  }
}catch(err){
  console.log(err)
}
})

app.post('/billplz-callback', async (req, res) => {
  const {
    id,
    collection_id,
    paid,
    state,
    amount,
    paid_amount,
    due_at,
    email,
    mobile,
    name,
    url,
    paid_at,
    x_signature,
  } = req.body;

  // Verify the signature
  const signatureData = `amount${amount}|collection_id${collection_id}|due_at${due_at}|email${email}|id${id}|mobile${mobile}|name${name}|paid_amount${paid_amount}|paid_at${paid_at}|paid${paid}|state${state}|url${url}`;
  console.log('x-signature:',x_signature);
  const calculatedSignature = crypto.createHmac('sha256', YOUR_SECRET_KEY).update(signatureData).digest('hex');
  console.log('calculated x-signature:', calculatedSignature);

  if (calculatedSignature !== x_signature) {
    console.error('Invalid signature. Callback ignored.');
    return res.status(400).send('Invalid signature');
  }

  if (collection_id !== YOUR_COLLECTION_ID) {
    console.error('Invalid collection ID. Callback ignored.');
    return res.status(400).send('Invalid collection ID');
  }

  // Log the received data
  console.log('Billplz Callback Received:');
  console.log('ID:', id);
  console.log('Collection ID:', collection_id);
  console.log('Paid:', paid);
  console.log('State:', state);
  console.log('Amount:', amount);
  console.log('Paid Amount:', paid_amount);
  console.log('Due At:', due_at);
  console.log('Email:', email);
  console.log('Mobile:', mobile);
  console.log('Name:', name);
  console.log('URL:', url);
  console.log('Paid At:', paid_at);

  // Your business logic goes here
  const tempBooking = await temp_bookings.findOne({where: {billId: id}});
  await bookings.create({
    name: name,
    email: email,
    phoneNumber: mobile,
    bookingDate: await tempBooking.bookingDate,
    bookingTime: await tempBooking.bookingTime,
    bookingPax: await tempBooking.bookingPax,
  }).then( async () => {
    await temp_bookings.destroy({where: {billId: id}})
  })

  // Send a response to Billplz
  res.status(200).send('Callback received successfully');
});



db.sequelize.sync().then(() => {
    server.listen(port, () => {
        console.log(`Server running on port: ${port}`);
    });
});