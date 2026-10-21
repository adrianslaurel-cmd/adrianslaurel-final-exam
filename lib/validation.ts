const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Email is required.';
  if (value.length > 254 || !EMAIL_RE.test(value)) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
}

export function validateName(name: string): string | null {
  const value = name.trim();
  if (!value) return 'Full name is required.';
  if (value.length < 2) return 'Name is too short.';
  if (value.length > 80) return 'Name is too long (max 80 characters).';
  return null;
}

export function validateIdNumber(id: string, required: boolean): string | null {
  const value = id.trim();
  if (!value) return required ? 'ID number is required.' : null;
  if (!/^[A-Za-z0-9-]{3,20}$/.test(value)) {
    return 'ID number may only contain letters, numbers and dashes (3-20 characters).';
  }
  return null;
}

export type EventInput = {
  title: string;
  venue: string;
  description: string;
  start: Date;
  end: Date;
};

export function validateEvent(input: EventInput): string | null {
  const title = input.title.trim();
  if (!title) return 'Event name is required.';
  if (title.length < 3) return 'Event name must be at least 3 characters.';
  if (title.length > 100) return 'Event name is too long (max 100 characters).';
  if (!input.venue.trim()) return 'Venue is required.';
  if (input.venue.trim().length > 100) return 'Venue is too long (max 100 characters).';
  if (input.description.trim().length > 500) return 'Description is too long (max 500 characters).';
  if (input.end.getTime() <= input.start.getTime()) return 'End time must be after the start time.';
  return null;
}
