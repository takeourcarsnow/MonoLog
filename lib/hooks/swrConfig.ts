export const defaultSWRConfig = {
  revalidateOnMount: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  focusThrottleInterval: 10000,
  errorRetryInterval: 5000,
};

export const longDedupingConfig = {
  ...defaultSWRConfig,
  dedupingInterval: 30000,
  focusThrottleInterval: 30000,
  errorRetryInterval: 10000,
};