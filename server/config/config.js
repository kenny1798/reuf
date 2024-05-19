require('dotenv').config();
    module.exports = {

  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "mysql",
    dialectOptions: {
      useUTC: false,
      timezone: '+08:00',
      dateStrings: true,
    },
    timezone: '+08:00', // for writing to database
  },
  test: {
    username: "root",
    password: null,
    database: "database_test",
    host: "127.0.0.1",
    dialect: "mysql"
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "mysql",
    dialectOptions: {
      useUTC: false,
      timezone: '+08:00',
      dateStrings: true,
    },
    timezone: '+08:00', // for writing to database
  }

    }