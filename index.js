const isDev = process.env.NODE_ENV !== "production"
const express = require('express')
const app = express()
const cors = require('cors')
const redis = require('redis')
const passport = require('passport')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const logger = require('morgan')

const corsOptions = {
  "origin": "http://localhost:8000",
  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "preflightContinue": true,
  "optionsSuccessStatus": 204,
  "credentials": true,
}

const { 
  ACCESS_SECRET
} = require('./config')

const { 
  jwtCookieStrategy
} = require('./utils')

const User = require('./User')

const rediscl = redis.createClient()
rediscl.on("connect", () => console.log("Redis is online."))

app.use(logger('dev'));
app.use(express.static(__dirname + '/public'))
app.use(cors(corsOptions))
app.use(cookieParser(ACCESS_SECRET))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(passport.initialize())
app.use(passport.session({}))

passport.use(jwtCookieStrategy)
passport.serializeUser((user, done) => {
  done(null, user.username)
})

app.post('/api/v1/register', User.register)
app.post('/api/v1/login', User.login)
app.post('/api/v1/token', passport.authenticate('jwt', { session: false }), User.token)
app.post('/api/v1/token/revoke', User.revoke)

app.get('/api/v1/test_jwt', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({
    success: 'Authenticated with JWT', 
    user: req.user,
  })
})

app.listen(process.env.PORT || 3000)