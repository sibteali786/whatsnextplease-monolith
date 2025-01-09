export const formatDate = (date: Date | null): string => {
  if (date) {
    const newDate = new Date(date);
    const formattedOne = `${newDate.getDay()}/${newDate.getFullYear().toString().substring(2)}`;
    return formattedOne;
  }

  return "Invalid Date";
};
