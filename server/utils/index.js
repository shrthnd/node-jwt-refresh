const { 
  ACCESS_SECRET, 
  POSTGRES_DB, 
  POSTGRES_SCHEMA_AUTH,
  POSTGRES_SCHEMA,
} = require('../config')

const JwtStrategy = require('passport-jwt').Strategy

const cookieExtractor = (req) => {
  let token = null
  if (req && req.cookies) token = req.cookies['jwt']
  
  if (typeof token !== "undefined")
    return token.replace('JWT ', '')
};

const jwtStrategyOptions = {
  jwtFromRequest: cookieExtractor,
  secretOrKey: ACCESS_SECRET,
}

const jwtCookieStrategy = new JwtStrategy(jwtStrategyOptions, (jwtPayload, done) => {
  const expirationDate = new Date(jwtPayload.exp * 1000)
  if(expirationDate < new Date()) {
    return done(null, false)
  }
  const user = jwtPayload
  done(null, user)
})

module.exports = {
  jwtCookieStrategy
}