const isDev = process.env.NODE_ENV !== "production"
const express = require('express')
const app = express()
const redis = require('redis')
const { postgraphile } = require("postgraphile")
const passport = require('passport')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const logger = require('morgan')

const { 
  ACCESS_SECRET, 
  POSTGRES_DB, 
  POSTGRES_SCHEMA_AUTH,
  POSTGRES_SCHEMA,
} = require('./config')

const { 
  jwtCookieStrategy
} = require('./utils')

const User = require('./user')

const rediscl = redis.createClient()
rediscl.on("connect", () => console.log("Redis is online."))

app.use(logger('dev'));
app.use(express.static(__dirname + '/public'))
app.use(cookieParser(ACCESS_SECRET))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(passport.initialize())
app.use(passport.session({}))

passport.serializeUser((user, done) => {
  done(null, user.username)
})
passport.use(jwtCookieStrategy)

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

// expose public graphql schema to authenticated users 
app.use(passport.authenticate('jwt', { session: false }), postgraphile(POSTGRES_DB, POSTGRES_SCHEMA, {
  graphiql: isDev,
  enhanceGraphiql: isDev,
  graphiqlRoute: '/graphiql',
  watchPg: isDev,
  dynamicJson: true,
  showErrorStack: isDev,
  extendedErrors:
    isDev
      ? [
          "errcode",
          "severity",
          "detail",
          "hint",
          "positon",
          "internalPosition",
          "internalQuery",
          "where",
          "schema",
          "table",
          "column",
          "dataType",
          "constraint",
          "file",
          "line",
          "routine",
        ]
      : ["errcode"],
    enableQueryBatching: true,
}))

app.listen(process.env.PORT || 3000)