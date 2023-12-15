export function replaceAsync(str: string, regex: RegExp, asyncFn: (match: string, ...args: any[]) => Promise<string>): Promise<string> {
    const promises: Promise<string>[] = [];
    str.replace(regex, (match, ...args) => {
        const promise = asyncFn(match, ...args);
        promises.push(promise);
        return match; // この戻り値は無視される
    });
    return Promise.all(promises).then(results => {
        return str.replace(regex, () => results.shift() ?? '');
    });
}