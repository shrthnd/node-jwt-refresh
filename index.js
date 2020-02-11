const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken')
const randToken = require('rand-token')
const passport = require('passport')

const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt

const { ACCESS_SECRET } = require('./config')
const { cookieExtractor } = require('./utils')

let refreshTokens = {} // redis session store
let opts = {}

app.use(express.static('public'))
app.use(cookieParser(ACCESS_SECRET))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

opts.jwtFromRequest = cookieExtractor
// opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken()
// opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt')
opts.secretOrKey = ACCESS_SECRET
app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => {
  done(null, user.username)
})

passport.use(new JwtStrategy(opts, function (jwtPayload, done) {
  const expirationDate = new Date(jwtPayload.exp * 1000)
  if(expirationDate < new Date()) {
    return done(null, false);
  }
  const user = jwtPayload
  done(null, user)
}))

// passport.deserializeUser((user, done) => {
//   done(null, user.username)
// })

app.post('/login', (req, res, next) => {
  const username = req.body.username
  const password = req.body.password
  const user = {
    'username': username,
    'role': 'admin',
  }
  const token = jwt.sign(user, ACCESS_SECRET, { expiresIn: 300 })
  const refreshToken = randToken.uid(256)

  // store refresh token (in redis?)
  refreshTokens[refreshToken] = username

  // respond with a JSON refreshToken 
  // set cookie with the access token 
  res.cookie("jwt", 'JWT ' + token, { httpOnly: true })
  res.json({ refreshToken: refreshToken })
})

app.post('/token', (req, res, next) => {
  const username = req.body.username
  const refreshToken = req.body.refreshToken

  if (refreshToken in refreshTokens && refreshTokens[refreshToken] == username) {
      const user = {
        'username': username,
        'role': 'admin',
      }
      const token = jwt.sign(user, ACCESS_SECRET, { expiresIn: 300 })

      // set cookie with the access token  
      res.cookie("jwt", 'JWT ' + token, { httpOnly: true })
      res.sendStatus(204)
  } else {
    res.sendStatus(401)
  }
})

app.post('/token/reject', (req, res, next) => {
  const refreshToken = req.body.refreshToken
  console.log(req)
  if ( refreshToken in refreshTokens ) {
    delete refreshTokens[refreshToken]
  }
  res.sendStatus(204)
})

app.get('/test_jwt', passport.authenticate('jwt', { session: false }), (req, res) => {
  console.log(req)
  res.json({
    success: 'You are authenticated with JWT!', 
    user: req.user,
    refreshTokens: refreshTokens
  })
})

app.listen(3000)