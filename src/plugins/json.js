export default {
  onSuccess(request, response) {
    response.parsedBody = () => {
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType === 'application/json') {
        return response.json();
      }
      return response.text();
    };
    return response;
  },
};
