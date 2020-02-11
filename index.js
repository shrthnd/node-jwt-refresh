const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken')
const randToken = require('rand-token')
const passport = require('passport')
const redis = require('redis')

var rediscl = redis.createClient();
rediscl.on("connect", function () {
    console.log("Redis plugged in.");
});

const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt
const { cookieExtractor } = require('./utils')

const { ACCESS_SECRET } = require('./config')


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

  // // store refresh token (in memory)
  // refreshTokens[refreshToken] = username
  
  // store refresh token (in redis?)
  rediscl.set(refreshToken, username, redis.print)

  // set cookie with the access token 
  res.cookie("jwt", 'JWT ' + token, { httpOnly: true })
  
  // respond with a JSON refreshToken 
  res.json({ refreshToken: refreshToken })
})

app.post('/token', (req, res, next) => {
  const username = req.body.username
  const refreshToken = req.body.refreshToken
  
  // if (refreshToken in refreshTokens && refreshTokens[refreshToken] == username) {}
  const storedToken = rediscl.get(refreshToken, function(error, result) {
    if (error) throw error;
    
    if (result == username) {
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
})

app.post('/token/reject', (req, res, next) => {
  const refreshToken = req.body.refreshToken
  
  // revoke token access
  // if ( refreshToken in refreshTokens ) {
  //   delete refreshTokens[refreshToken] 
  // }
  rediscl.del(refreshToken)
  res.clearCookie("jwt")
  res.sendStatus(204)
})

app.get('/test_jwt', passport.authenticate('jwt', { session: false }), (req, res) => {
  // console.log(req)
  res.json({
    success: 'You are authenticated with JWT!', 
    user: req.user,
    refreshTokens: refreshTokens
  })
})

app.listen(3000)