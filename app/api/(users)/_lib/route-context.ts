export async function resolveRouteParams<T>(params: T | Promise<T>): Promise<T> {
  return await Promise.resolve(params)
}