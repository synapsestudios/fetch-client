export const allowedEncodings = [
  'json',
  'text',
  'form-data',
  'x-www-form-urlencoded',
];

export const defaults = {
  encoding: 'json',
  post: {
    method: 'post',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },
  put: {
    method: 'post',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },
  patch: {
    method: 'post',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },
};
