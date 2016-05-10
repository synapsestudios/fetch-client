let getJwtToken = function getJwtToken() {
  throw new Error('You must define getJwtToken with client.helpers.setJwtTokenGetter');
};

export default {
  onStart(request) {
    request.headers.append('Authorization', this.helpers.getJwtToken());
    return request;
  },

  helpers: {
    setJwtTokenGetter: func => {
      getJwtToken = func;
    },

    getJwtToken,
  },
};
