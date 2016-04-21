export const allowedEncodings = [
  false,
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
    },
  },
  put: {
    method: 'post',
    headers: {
      Accept: 'application/json',
    },
  },
  patch: {
    method: 'post',
    headers: {
      Accept: 'application/json',
    },
  },
};
