const cookieExtractor = function(req) {
  var token = null;
  if (req && req.cookies) token = req.cookies['jwt'];
  
  if (typeof token !== null)
    return token.replace('JWT ', '')
};

module.exports = {
  cookieExtractor
}