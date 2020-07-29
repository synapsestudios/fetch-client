class JwtPlugin {
  constructor() {
    this.helpers = {
      setJwtTokenGetter(func) {
        this.getJwtToken = func;
      },

      getJwtToken() {
        throw new Error(
          'You must define getJwtToken with client.helpers.setJwtTokenGetter'
        );
      },
    };
  }

  onStart(request) {
    const jwtToken = this.client.getJwtToken();
    if (jwtToken) {
      request.headers.append('Authorization', jwtToken);
    }
    return request;
  }
}

export default JwtPlugin;
