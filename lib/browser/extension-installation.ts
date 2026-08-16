const extensionInstallationStorageKey = "sendbase:extension-installed"

export function getStoredExtensionInstallation() {
  try {
    const value = window.localStorage.getItem(extensionInstallationStorageKey)
    if (value === "true") return true
    if (value === "false") return false
  } catch {
    // Private browsing or browser policies can disable local storage.
  }

  return null
}

function saveExtensionInstallation(installed: boolean) {
  try {
    window.localStorage.setItem(
      extensionInstallationStorageKey,
      String(installed)
    )
  } catch {
    // The in-memory result remains usable when local storage is unavailable.
  }
}

export function checkExtensionInstallation() {
  return new Promise<boolean>((resolve) => {
    const requestId = crypto.randomUUID()

    const complete = (installed: boolean) => {
      saveExtensionInstallation(installed)
      resolve(installed)
    }

    const listener = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) return

      const data = event.data as Record<string, unknown> | null
      if (
        !data ||
        data.type !== "SENDBASE_EXTENSION_CHECK_RESULT" ||
        data.requestId !== requestId
      ) {
        return
      }

      window.clearTimeout(timeout)
      window.removeEventListener("message", listener)
      complete(data.installed === true)
    }

    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", listener)
      complete(false)
    }, 1_500)

    window.addEventListener("message", listener)
    window.postMessage(
      {
        source: "SENDBASE_SAAS",
        type: "SENDBASE_EXTENSION_CHECK",
        requestId,
      },
      window.location.origin
    )
  })
}
