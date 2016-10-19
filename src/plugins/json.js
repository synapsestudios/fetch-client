export default {
  onSuccess: (request, response) => {
    response.parsedBody = () => {
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.match(/application\/json/)) {
        return response.json();
      }
      return response.text();
    };
    return response;
  },
  onFail: (request, response) => {
    response.parsedBody = () => {
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.match(/application\/json/)) {
        return response.json();
      }
      return response.text();
    };
    return response;
  },
};
