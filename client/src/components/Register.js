import React from "react"
import { navigate } from "gatsby"
import Form from "./Form"
import View from "./View"
import { handleRegistration, isLoggedIn } from "../utils/auth"

class Register extends React.Component {
  state = {
    username: ``,
    password: ``,
  }

  handleUpdate(event) {
    this.setState({
      [event.target.name]: event.target.value,
    })
  }

  handleSubmit(e) {
    e.preventDefault()
    handleRegistration(this.state)    
  }

  render() {
    if (isLoggedIn()) {
      navigate(`/app/profile`)
    }

    return (
      <View title="Register">
        <Form
          handleUpdate={e => this.handleUpdate(e)}
          handleSubmit={e => this.handleSubmit(e)}
        />
      </View>
    )
  }
}

export default Register