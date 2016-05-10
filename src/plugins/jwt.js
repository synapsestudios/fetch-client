import localStorage from 'store2';

let getJwtToken = () => (localStorage.get('token') || {}).token;

export default {
  onStart: (request) => {
    console.log('request', request);
    return request;
  },

  helpers: {
    setCustomGetJwtTokenFunc: func => {
      getJwtToken = func;
    },

    getJwtToken,
  },
};
