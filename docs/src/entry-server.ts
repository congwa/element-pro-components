import { basename } from 'path'
import { createApp } from './main'
import { renderToString } from '@vue/server-renderer'
import { renderHeadToString } from '@vueuse/head'

export async function render(
  url: string,
  manifest: Record<string, string[]>
): Promise<string[]> {
  const { app, router, head } = createApp()

  // set the router to the desired URL before rendering
  await router.push(url)
  await router.isReady()

  // passing SSR context object which will be available via useSSRContext()
  // @vitejs/plugin-vue injects code into a component's setup() that registers
  // itself on ctx.modules. After the render, ctx.modules would contain all the
  // components that have been instantiated during this render call.
  const ctx = { modules: new Set<string>(), teleports: {} }
  const html = await renderToString(app, ctx)

  // get the page title of SSG
  const { headTags } = renderHeadToString(head)

  // the SSR manifest generated by Vite contains module -> chunk/asset mapping
  // which we can then use to determine what files need to be preloaded for this
  // request.
  const preloadLinks = headTags + renderPreloadLinks(ctx.modules, manifest)

  // the SSR needs to process the teleports content separately when rendering
  const teleports = renderTeleports(ctx.teleports)
  return [html, preloadLinks, teleports]
}

function renderPreloadLinks(
  modules: Set<string>,
  manifest: Record<string, string[]>
) {
  let links = ''
  const seen = new Set()
  modules.forEach((id) => {
    const files = manifest[id]
    if (files) {
      files.forEach((file) => {
        if (!seen.has(file)) {
          seen.add(file)
          const filename = basename(file)
          if (manifest[filename]) {
            for (const depFile of manifest[filename]) {
              links += renderPreloadLink(depFile)
              seen.add(depFile)
            }
          }
          links += renderPreloadLink(file)
        }
      })
    }
  })
  return links
}

function renderPreloadLink(file: string) {
  if (file.endsWith('.js')) {
    return `<link rel="modulepreload" crossorigin href="${file}">`
  } else if (file.endsWith('.css')) {
    return `<link rel="stylesheet" href="${file}">`
  } else if (file.endsWith('.woff')) {
    return ` <link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`
  } else if (file.endsWith('.woff2')) {
    return ` <link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`
  } else if (file.endsWith('.gif')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/gif">`
  } else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/jpeg">`
  } else if (file.endsWith('.png')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/png">`
  } else {
    // TODO
    return ''
  }
}

function renderTeleports(teleports: Record<string, string>) {
  let result = ''

  for (const key in teleports) {
    const item = teleports[key]

    if (key === 'body') {
      result += item
    } else if (key.startsWith('#el-popper-container-')) {
      result += `<div id="${key.slice(1)}">${item}</div>`
    } else {
      console.log(`There are unprocessed teleports: ${key}`)
    }
  }

  return result
}
