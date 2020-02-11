const cookieExtractor = function(req) {
  var token = null;
  if (req && req.cookies) token = req.cookies['jwt'];
  
  if (typeof token !== "undefined")
    return token.replace('JWT ', '')
};

module.exports = {
  cookieExtractor
}