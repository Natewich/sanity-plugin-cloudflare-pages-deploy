import axios from 'axios'
import React, { useEffect, useState } from 'react'
import spacetime from 'spacetime'

import { TransferIcon } from '@sanity/icons'
import {
  Avatar,
  Box,
  Card,
  Flex,
  Inline,
  Label,
  Spinner,
  Stack,
  Text,
  Tooltip,
} from '@sanity/ui'

import DeployStatus from './deploy-status'
import type { Deployments, SanityDeploySchema } from './types'

interface DeployHistoryProps
  extends Omit<SanityDeploySchema, 'id' | 'name' | 'disableDeleteAction'> {}
const DeployHistory: React.FC<DeployHistoryProps> = ({
  cloudflareApiEndpointUrl,
  cloudflareProject,
  cloudflareAPIKey,
  cloudflareEmail,
}) => {
  const [deployments, setDeployments] = useState<Deployments[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!cloudflareProject) {
      return
    }
    setLoading(true)

    axios
      .get(cloudflareApiEndpointUrl, {
        headers: {
          'X-Auth-Email': cloudflareEmail,
          'X-Auth-Key': cloudflareAPIKey,
          'Content-Type': 'application/json',
        },
      })
      .then(({ data }) => {
        setDeployments(data.deployments)
        setLoading(false)
        setError(false)
      })
      .catch((e) => {
        setLoading(false)
        setError(true)
        console.warn(e)
      })
  }, [
    cloudflareApiEndpointUrl,
    cloudflareProject,
    cloudflareEmail,
    cloudflareAPIKey,
  ])

  if (loading) {
    return (
      <Flex direction="column" align="center" justify="center" paddingTop={3}>
        <Spinner size={4} />
        <Box padding={4}>
          <Text size={2}>loading deployment history...</Text>
        </Box>
      </Flex>
    )
  }

  if (error) {
    return (
      <Card padding={4} radius={2} shadow={1} tone="critical">
        <Text size={2} align="center">
          Could not load deployments for {cloudflareProject}
        </Text>
      </Card>
    )
  }

  return (
    <Box as={'ul'} padding={0}>
      <Card as={'li'} padding={4} borderBottom>
        <Flex>
          <Box flex={3}>
            <Label muted>Preview URL</Label>
          </Box>
          <Box flex={1} marginLeft={2}>
            <Label muted>State</Label>
          </Box>
          <Box flex={3} marginLeft={2} style={{ maxWidth: '40%' }}>
            <Label muted>Commit</Label>
          </Box>
          <Box flex={2} marginLeft={2}>
            <Label align="right" muted>
              Deployed At
            </Label>
          </Box>
        </Flex>
      </Card>

      {deployments?.map((deployment) => (
        <Card key={deployment.uid} as={'li'} padding={4} borderBottom>
          <Flex align="center">
            <Box flex={3}>
              <Text weight="semibold">
                <Box
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <a
                    href={`https://${deployment.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit' }}
                  >
                    {deployment.url}
                  </a>
                </Box>
              </Text>
            </Box>
            <Box flex={1} marginLeft={2}>
              <Text>
                <DeployStatus status={deployment.state} />
              </Text>
            </Box>
            <Box flex={3} marginLeft={2} style={{ maxWidth: '40%' }}>
              <Stack space={2}>
                <Text>
                  <Box
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {deployment.meta?.githubCommitMessage}
                  </Box>
                </Text>
                <Text size={2} muted>
                  <Inline space={3}>
                    <TransferIcon />
                    {deployment.meta?.githubCommitRef}
                  </Inline>
                </Text>
              </Stack>
            </Box>
            <Flex flex={2} justify="flex-end" marginLeft={2}>
              <Inline space={2}>
                <Text style={{ whiteSpace: 'nowrap' }} muted>
                  {spacetime.now().since(spacetime(deployment.created)).rounded}
                </Text>
              </Inline>
            </Flex>
          </Flex>
        </Card>
      ))}
    </Box>
  )
}

export default DeployHistory
