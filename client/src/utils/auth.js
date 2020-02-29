import { navigate } from "gatsby"
const isBrowser = typeof window !== `undefined`
const registerUrl = 'http://localhost:3000/api/v1/register'
const loginUrl = 'http://localhost:3000/api/v1/login'
const tokenUrl = 'http://localhost:3000/api/v1/token'
const revokeUrl = 'http://localhost:3000/api/v1/token/revoke'

async function postData(url = '', data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'include', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'username='+data.username+'&password='+data.password
  });
  return await response.json(); // parses JSON response into native JavaScript objects
}

const getUser = () =>
  window.localStorage.gatsbyUser
    ? JSON.parse(window.localStorage.gatsbyUser)
    : {}

const setUser = user => (window.localStorage.gatsbyUser = JSON.stringify(user))

export const handleLogin = ({ username, password }) => {
  if (!isBrowser) return false
  
  postData(loginUrl, { username, password })
  .then((userToken) => {
    return setUser(userToken)
  }).then((userObject) => {
    const status = JSON.parse(userObject)
    if (status.refreshToken.length)
      navigate('/app/profile')
  })
  
  return false
}

export const handleRegistration = ({ username, password }) => {
  if (!isBrowser) return false

  postData(registerUrl, { username, password })
  .then((userToken) => {
    return setUser(userToken)
  }).then((userObject) => {
    const status = JSON.parse(userObject)
    if (status.refreshToken.length)
      navigate('/app/profile')
  })
  
  return false
}

export const isLoggedIn = () => {
  if (!isBrowser) return false

  const user = getUser()

  return !!user.refreshToken
}

export const getCurrentUser = () => isBrowser && getUser()

export const logout = callback => {
  if (!isBrowser) return

  setUser({})
  callback()
}