import { definePlugin } from 'sanity'
import { route } from 'sanity/router'

import { default as deployIcon } from './deploy-icon'
import type { CloudflarePagesDeployConfig } from './types'
import CloudflarePagesDeploy from './cloudflare-deploy'

export const cloudflarePagesDeployTool =
  definePlugin<CloudflarePagesDeployConfig | void>((options) => {
    const { name, title, icon, ...config } = options || {}

    return {
      name: 'sanity-plugin-cloudflare-pages-deploy',
      tools: [
        {
          name: name || 'deploy',
          title: title || 'Deploy',
          icon: icon || deployIcon,
          component: CloudflarePagesDeploy,
          options: config,
          router: route.create('/*'),
        },
      ],
    }
  })
