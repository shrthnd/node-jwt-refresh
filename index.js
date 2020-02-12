const express = require('express')
const app = express()
const redis = require('redis')
const passport = require('passport')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const logger = require('morgan')
const randToken = require('rand-token')

const JwtStrategy = require('passport-jwt').Strategy

const { cookieExtractor } = require('./utils')
const { ACCESS_SECRET } = require('./config')

const jwtStrategyOptions = {
  jwtFromRequest: cookieExtractor,
  secretOrKey: ACCESS_SECRET,
}
const jwtCookieOptions = { 
  // secure: true,
  httpOnly: true,
}
const jwtTokenOptions = {
  expiresIn: 300,
}

const userObject = (username) => {
  return {
    'username': username,
    'role': 'admin',
  }
}

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

passport.use(new JwtStrategy(jwtStrategyOptions, (jwtPayload, done) => {
  const expirationDate = new Date(jwtPayload.exp * 1000)
  if(expirationDate < new Date()) {
    return done(null, false)
  }
  const user = jwtPayload
  done(null, user)
}))

app.post('/api/v1/register', (req, res, next) => {
  const username = req.body.username
  const password = req.body.password

  // add database check
  if (username.length && password.length) {
    const user = userObject(username)
    const token = jwt.sign(user, ACCESS_SECRET, jwtTokenOptions)
    const refreshToken = randToken.uid(256)

    const salt = bcrypt.genSaltSync(10)
    const hash = bcrypt.hashSync(password, salt)
    const secrets = `${salt} ${hash}`

    // store refresh token
    rediscl.set(refreshToken, username, redis.print)
    
    // store secrets as temporary user store
    rediscl.set(username, secrets, redis.print)
  
    // set cookie with the access token & 
    // respond with a JSON refreshToken 
    res.cookie("jwt", 'JWT ' + token, jwtCookieOptions)
    res.json({ refreshToken: refreshToken })
  } else {
    res.sendStatus(401)
  }
})

app.post('/api/v1/login', (req, res, next) => {
  const username = req.body.username
  const password = req.body.password

  // add database check
  if (username.length && password.length) {
    // get secrets from temporary user store
    rediscl.get(username, function(error, result) {
      if (!error && result) {
        const secrets = result.split(' ')
        const salt = secrets[0]
        const hash = secrets[1]
  
        if (bcrypt.compareSync(password, hash)) {
          const user = userObject(username)
          const token = jwt.sign(user, ACCESS_SECRET, jwtTokenOptions)
          const refreshToken = randToken.uid(256)
        
          // store refresh token if it doesn't exist
          !rediscl.get(refreshToken, redis.print)
            rediscl.set(refreshToken, username, redis.print)
        
          // set cookie with the access token & 
          // respond with a JSON refreshToken 
          res.cookie("jwt", 'JWT ' + token, jwtCookieOptions)
          res.json({ refreshToken: refreshToken })
        } else {
          res.clearCookie("jwt")
          res.json({ refreshToken: '' })
        }
      } else { 
        res.clearCookie("jwt")
        res.json({ refreshToken: '' })
      } 
    })
  } else {
    res.clearCookie("jwt")
    res.sendStatus(401)
  }
})

app.post('/api/v1/token', passport.authenticate('jwt', { session: false }), (req, res, next) => {
  // get username from req.user (passport middleware) and refresh token from req.body
  const username = req.user.username
  const refreshToken = req.body.refreshToken

  const storedToken = rediscl.get(refreshToken, function(error, result) {
    if (error) throw error
    
    if (result == username) {
      const user = userObject(username)
      const token = jwt.sign(user, ACCESS_SECRET, jwtTokenOptions)

      // set cookie with the access token  
      res.cookie("jwt", 'JWT ' + token, jwtCookieOptions)
      res.sendStatus(204)
    } else {
      res.clearCookie("jwt")
      res.sendStatus(401)
    }
  })
})

app.post('/api/v1/token/revoke', (req, res, next) => {
  const refreshToken = req.body.refreshToken
  rediscl.del(refreshToken)
  res.clearCookie("jwt")
  res.sendStatus(204)
})

app.get('/api/v1/test_jwt', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({
    success: 'Authenticated with JWT', 
    user: req.user,
  })
})

app.listen(3000)