import localStorage from 'store2';

let getJwtToken = () => (localStorage.get('token') || {}).token;

export default {
  onStart(request) {
    request.headers.append('Authorization', this.helpers.getJwtToken());
    return request;
  },

  helpers: {
    setCustomGetJwtTokenFunc: func => {
      getJwtToken = func;
    },

    getJwtToken,
  },
};
