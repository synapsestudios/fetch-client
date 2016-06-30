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
    headers: {
      Accept: 'application/json',
    },
  },
  put: {
    headers: {
      Accept: 'application/json',
    },
  },
  patch: {
    headers: {
      Accept: 'application/json',
    },
  },
};
