import bcrypt from 'bcrypt';
export const hashPW = (password: string) => {
  return bcrypt.hash(password, 10);
};

export const comparePwd = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};
