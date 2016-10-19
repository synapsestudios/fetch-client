export default {
  onSuccess: function onSuccess(request, response) {
    response.parsedBody = function () {
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.match(/application\/json/)) {
        return response.json();
      }
      return response.text();
    };
    return response;
  },
  onFail: function onSuccess(request, response) {
    response.parsedBody = function () {
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.match(/application\/json/)) {
        return response.json();
      }
      return response.text();
    };
    return response;
  }
};
