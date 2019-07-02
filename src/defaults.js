export const allowedEncodings = [
  false,
  'json',
  'text',
  'form-data',
  'x-www-form-urlencoded',
];

export const defaults = {
  bracketStyleArrays: false,
  timeout: 10000,
  queryStringifier(body) {
    const urlSearchParams = new URLSearchParams();
    this._encodeForm(body, urlSearchParams, true);
    return `?${urlSearchParams.toString()}`;
  },
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
