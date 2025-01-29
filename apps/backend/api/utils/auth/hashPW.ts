import bcrypt from 'bcrypt';
export const hashPW = (password: string) => {
  return bcrypt.hash(password, 10);
};
