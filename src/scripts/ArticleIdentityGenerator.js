export function generateArticalIdentity(title, date, author) {
    const sanitize = (str) =>
        String(str)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

    const sanitizedTitle = sanitize(title);
    const sanitizedDate = sanitize(date);
    const sanitizedAuthor = sanitize(author);

    return `${sanitizedTitle}-${sanitizedDate}-${sanitizedAuthor}`
}