require('dotenv').config()

const PORT = process.env.SERVER_PORT || 3001
const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY
const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX
const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_EMAIL_TO = process.env.SENDGRID_EMAIL_TO

const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const mailchimp = require('@mailchimp/mailchimp_marketing')
const sendgrid = require('@sendgrid/mail');

const allowlist = ['https://itsajoke.eu', 'https://annee.itsajoke.eu']
const corsOptionsDelegate = function (req, callback) {
  var corsOptions;
  if (allowlist.indexOf(req.header('Origin')) !== -1) {
    corsOptions = { origin: true } 
  } else {
    corsOptions = { origin: false } 
  }
  callback(null, corsOptions)
}

const app = express()
app.use(cors(corsOptionsDelegate))
app.use(bodyParser.json())

mailchimp.setConfig({
    apiKey: MAILCHIMP_API_KEY,
    server: MAILCHIMP_SERVER_PREFIX,
})
sendgrid.setApiKey(SENDGRID_API_KEY)

const subscribe = async (email, fname = null, group = null) => {
    return new Promise((resolve, reject) => {
        const payload = {
            email_address: email,
            status: "subscribed",
            merge_fields: {
              'FNAME': fname,
              'GROUP': group
            }
        }
        mailchimp.lists.addListMember(MAILCHIMP_LIST_ID, payload)
        .then(res => {
            resolve(res)
        })
        .catch(err => {
            reject(err)
        })
    })
}

const send = async (text, from, name =  null) => {
  return new Promise((resolve, reject) => {
      const message = {
          text: `Message from ${from}${name ? `<${name}>` : ''}: ${text}`,
          from: SENDGRID_EMAIL_TO,
          subject: `Message from ${from}${name ? `<${name}>` : ''}`,
          to: SENDGRID_EMAIL_TO
      }
      sendgrid.send(message)
      .then(res => {
          resolve(res)
      })
      .catch(err => {
          reject(err)
      })
  })
}

app.post('/newsletter', async (req, res) => {
  if(req.body && req.body.email) {
    const fname = req.body?.fname ? req.body.fname : null
    const group = req.body?.group ? req.body.group : null
    subscribe(req.body.email, fname, group )
    .then(() => {
        res.status(201).json({ message: 'Email succesfully added.' })
    })
    .catch(error => {
        const { status, title, detail } = error.response.body
        res.status(status).json({ message: `${title} - ${detail}` })
    })
  } else {
      res.status(400).json({ message: 'No email attached. Request rejected.' })
  }
})

app.post('/send', async (req, res) => {
  if(req.body && req.body.text && req.body.from) {
    const name = req.body?.name ? req.body.name : null
    send(req.body.text, req.body.from, name)
    .then( _ => {
        res.status(201).json({ message: 'Email succesfully sent.' })
    }, error => {
      const errorMessage = error.response.body.errors.reduce((acc, curr) => `${acc === '' ? '' : ' - '}${curr.message}`, '')
      res.status(status).json({ message: errorMessage })
    })
  } else {
      res.status(400).json({ message: 'Sender email and message are required. Request rejected.' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running at: http://localhost:${PORT}/`)
})