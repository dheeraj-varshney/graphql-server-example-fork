const axios = require('axios');

const response = axios.post('http://localhost:9999/graphql', {
    "query": "mutation TEST($name: String!,$dob: String!,$telephoneNum: String!,$gender: String!,$profAddress: String!,$profCity: String!,$profPincode: String!,$stateId: String!,$allowSmsNotification: String!) {updateUserInfoV2(  name: $name,  dob: $dob,  telephoneNum: $telephoneNum,  gender: $gender,  profAddress: $profAddress,  profCity: $profCity,  profPincode: $profPincode,  stateId: $stateId,  allowSmsNotification: $allowSmsNotification) {    MsgText    message    success  }}    ",
    "variables": {
      "name": "Person Name",
      "dob": "1970-1-01",
      "telephoneNum": "9999999999",
      "gender": "male",
      "profAddress": "address",
      "profCity": "city",
      "profPincode": "123456",
      "stateId": 34,
      "allowSmsNotification": 1
    }
  }, {
    headers: {
      'x-test-id': "1632460052246607",
      port: 55609,
    },
}).then(res => {
    console.log("res", res);
})

// console.log("response", response);