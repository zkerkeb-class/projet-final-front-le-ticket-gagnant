const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const normalizeUsername = (value: string): string => value.trim();

export const isValidEmail = (value: string): boolean => EMAIL_REGEX.test(normalizeEmail(value));

export const isStrongPassword = (value: string): boolean => STRONG_PASSWORD_REGEX.test(value);

export const validateLoginInput = (email: string, password: string): string | null => {
  if (!email.trim() || !password) {
    return "Veuillez remplir tous les champs.";
  }

  if (!isValidEmail(email)) {
    return "Veuillez saisir une adresse email valide.";
  }

  return null;
};

export const validateRegisterInput = (
  username: string,
  email: string,
  password: string,
  confirmPassword: string,
): string | null => {
  if (!normalizeUsername(username) || !email.trim() || !password || !confirmPassword) {
    return "Veuillez remplir tous les champs.";
  }

  if (!isValidEmail(email)) {
    return "Veuillez saisir une adresse email valide.";
  }

  if (password !== confirmPassword) {
    return "Les mots de passe ne correspondent pas.";
  }

  if (!isStrongPassword(password)) {
    return "Utilisez au moins 8 caracteres avec majuscule, minuscule, chiffre et caractere special.";
  }

  return null;
};

export const validateProfileInput = (username: string, email: string): string | null => {
  if (!normalizeUsername(username) || !email.trim()) {
    return "Username et email sont requis.";
  }

  if (!isValidEmail(email)) {
    return "Veuillez saisir une adresse email valide.";
  }

  return null;
};
