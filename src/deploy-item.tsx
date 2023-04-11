import axios from 'axios'
import React, { useEffect, useState } from 'react'
import spacetime from 'spacetime'
import useSWR from 'swr'

import {
  ClockIcon,
  EditIcon,
  EllipsisVerticalIcon,
  TrashIcon,
} from '@sanity/icons'
import {
  Badge,
  Box,
  Button,
  Card,
  Code,
  Dialog,
  Flex,
  Grid,
  Heading,
  Inline,
  Menu,
  MenuButton,
  MenuItem,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
  useToast,
} from '@sanity/ui'

import { FormField } from 'sanity'
import DeployHistory from './deploy-history'
import DeployStatus from './deploy-status'
import { useClient } from './hook/useClient'
import type { SanityDeploySchema, StatusType } from './types'

const fetcher = (url: string, email: string, key: string) =>
  axios
    .get(url, {
      headers: {
        'X-Auth-Email': email,
        'X-Auth-Key': key,
        'Content-Type': 'application/json',
      },
    })
    .then((res) => res.data)

const initialDeploy = {
  name: '',
  title: '',
  cloudflareApiEndpointUrl: '',
  cloudflareProject: '',
  cloudflareEmail: '',
  cloudflareAPIKey: '',
  disableDeleteAction: false,

  // name: '',
  // title: '',
  // project: '',
  // team: '',
  // url: '',
  // token: '',
  // disableDeleteAction: false,
}

interface DeployItemProps extends SanityDeploySchema {}
const DeployItem: React.FC<DeployItemProps> = ({
  name,
  id,
  cloudflareApiEndpointUrl,
  cloudflareProject,
  cloudflareEmail,
  cloudflareAPIKey,
  disableDeleteAction,
  _id,

  // name,
  // url,
  // vercelProject,
  // vercelToken,
  // vercelTeam,
  // disableDeleteAction,
}) => {
  const client = useClient()

  const [isLoading, setIsLoading] = useState(true)
  const [isDeploying, setDeploying] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const [pendingDeploy, setpendingDeploy] = useState(initialDeploy)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusType>('LOADING')
  const [timestamp, setTimestamp] = useState<string | null>(null)
  const [buildTime, setBuildTime] = useState<string | null>(null)

  const toast = useToast()

  const { data: deploymentData } = useSWR(
    () => [cloudflareApiEndpointUrl, cloudflareEmail, cloudflareAPIKey],
    (url, email, apiKey) => fetcher(url, email, apiKey),
    {
      errorRetryCount: 3,
      refreshInterval: isDeploying ? 5000 : 0,
      onError: (err) => {
        setStatus('ERROR')
        setErrorMessage(err.response?.data?.error?.message)
        setIsLoading(false)
      },
    }
  )

  const onDeploy = (
    _name: string,
    _url: string,
    cloudflareEmail: string,
    cloudflareAPIKey: string
  ) => {
    setStatus('INITIATED')
    setDeploying(true)
    setTimestamp(null)
    setBuildTime(null)

    axios
      .post(cloudflareApiEndpointUrl, null, {
        headers: {
          'X-Auth-Email': cloudflareEmail,
          'X-Auth-Key': cloudflareAPIKey,
          'Content-Type': 'application/json',
        },
      })
      .then(() => {
        toast.push({
          status: 'success',
          title: 'Success!',
          description: `Triggered Deployment: ${_name}`,
        })
      })
      .catch((err) => {
        setDeploying(false)
        toast.push({
          status: 'error',
          title: 'Deploy Failed.',
          description: `${err}`,
        })
      })
  }

  const onCancel = (deploymentId: string) => {
    setIsLoading(true)
    axios
      .post(`${cloudflareApiEndpointUrl}/${deploymentId}/cancel`, null, {
        headers: {
          'X-Auth-Email': cloudflareEmail,
          'X-Auth-Key': cloudflareAPIKey,
          'Content-Type': 'application/json',
        },
      })
      .then((res) => res.data)
      .then((res) => {
        setStatus('CANCELED')
        setDeploying(false)
        setIsLoading(false)
        setBuildTime(null)
        setTimestamp(res.canceledAt)
      })
  }

  const onRemove = (_name: string, _id: string) => {
    setIsLoading(true)
    client.delete(_id).then(() => {
      toast.push({
        status: 'success',
        title: `Successfully deleted deployment: ${_name}`,
      })
    })
  }

  const onEdit = () => {
    setpendingDeploy({
      title: name,
      disableDeleteAction,
      name,
      cloudflareApiEndpointUrl,
      cloudflareProject,
      cloudflareEmail,
      cloudflareAPIKey,
    })
    setIsFormOpen(true)
  }

  const onSubmitEdit = async () => {
    setIsSubmitting(true)

    client
      .patch(_id)
      .set({
        name: pendingDeploy.title,
        cloudflareApiEndpointUrl: pendingDeploy.cloudflareApiEndpointUrl,
        cloudflareProject: pendingDeploy.cloudflareProject,
        cloudflareAPIKey: pendingDeploy.cloudflareAPIKey,
        cloudflareEmail: pendingDeploy.cloudflareEmail,
        disableDeleteAction: pendingDeploy.disableDeleteAction,
      })
      .commit()
      .then(() => {
        toast.push({
          status: 'success',
          title: 'Success!',
          description: `Updated Deployment: ${pendingDeploy.title}`,
        })

        setIsFormOpen(false)
        setIsSubmitting(false)
      })
  }

  // set status when new deployment data comes in
  useEffect(() => {
    let isSubscribed = true

    if (deploymentData?.result && isSubscribed) {
      const latestDeployment = deploymentData.result[0]

      setStatus(latestDeployment?.latest_stage.status || 'READY')

      if (latestDeployment?.created_on) {
        setTimestamp(latestDeployment?.created_on)
      }

      setIsLoading(false)
    }

    return () => {
      isSubscribed = false
    }
  }, [deploymentData])

  // update deploy state after status is updated
  useEffect(() => {
    let isSubscribed = true

    if (isSubscribed) {
      if (status === 'READY' || status === 'ERROR' || status === 'CANCELED') {
        setDeploying(false)
      } else if (status === 'BUILDING' || status === 'INITIATED') {
        setDeploying(true)
      }
    }

    return () => {
      isSubscribed = false
    }
  }, [status])

  // count build time
  const tick = (_timestamp: string | null) => {
    if (_timestamp) {
      setBuildTime(spacetime.now().since(spacetime(_timestamp)).rounded)
    }
  }

  useEffect(() => {
    let isTicking = true
    const timer = setInterval(() => {
      if (isTicking && isDeploying) {
        tick(timestamp)
      }
    }, 1000)

    if (!isDeploying) {
      clearInterval(timer)
    }

    return () => {
      isTicking = false
      clearInterval(timer)
    }
  }, [timestamp, isDeploying])

  return (
    <>
      <Flex
        wrap="wrap"
        direction={['column', 'column', 'row']}
        align={['flex-end', 'flex-end', 'center']}
      >
        <Box flex={[4, 1]} paddingBottom={[4, 4, 1]}>
          <Stack space={3}>
            <Inline space={2}>
              <Heading as="h2" size={1}>
                <Text weight="semibold">{name}</Text>
              </Heading>
              <Badge
                tone="primary"
                paddingX={3}
                paddingY={2}
                radius={6}
                fontSize={0}
              >
                {cloudflareProject}
              </Badge>
            </Inline>
            <Code size={1}>
              <Box
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {cloudflareApiEndpointUrl}
              </Box>
            </Code>
          </Stack>
        </Box>
        <Flex
          wrap="nowrap"
          align="center"
          marginLeft={[0, 0, 4]}
          flex={[1, 'none']}
        >
          <Inline space={2}>
            {cloudflareAPIKey && cloudflareProject && (
              <Box marginRight={2}>
                <Stack space={2}>
                  <DeployStatus status={status} justify="flex-end">
                    {errorMessage && (
                      <Box marginLeft={2}>
                        <Tooltip
                          content={
                            <Box padding={2}>
                              <Text muted size={1}>
                                {errorMessage}
                              </Text>
                            </Box>
                          }
                          placement="top"
                        >
                          <Badge mode="outline" tone="critical">
                            ?
                          </Badge>
                        </Tooltip>
                      </Box>
                    )}
                  </DeployStatus>

                  <Text align="right" size={1} muted>
                    {/* eslint-disable-next-line no-nested-ternary */}
                    {isDeploying
                      ? buildTime || '--'
                      : timestamp
                      ? spacetime.now().since(spacetime(timestamp)).rounded
                      : '--'}
                  </Text>
                </Stack>
              </Box>
            )}

            <Button
              type="button"
              tone="positive"
              disabled={isDeploying || isLoading}
              loading={isDeploying || isLoading}
              onClick={() =>
                onDeploy(
                  name,
                  cloudflareApiEndpointUrl,
                  cloudflareEmail,
                  cloudflareAPIKey
                )
              }
              paddingX={[5]}
              paddingY={[4]}
              radius={3}
              text="Deploy"
            />

            {isDeploying && (status === 'BUILDING' || status === 'QUEUED') && (
              <Button
                type="button"
                tone="critical"
                onClick={() => {
                  onCancel(deploymentData.result[0].id)
                }}
                radius={3}
                text="Cancel"
              />
            )}

            <MenuButton
              id={id}
              button={
                <Button
                  mode="bleed"
                  icon={EllipsisVerticalIcon}
                  disabled={isDeploying || isLoading}
                />
              }
              popover={{ portal: true, placement: 'bottom-end' }}
              menu={
                <Menu>
                  <MenuItem
                    text="History"
                    icon={ClockIcon}
                    onClick={() => setIsHistoryOpen(true)}
                    disabled={!deploymentData?.result.length}
                  />
                  <MenuItem
                    text="Edit"
                    icon={EditIcon}
                    tone="primary"
                    onClick={() => onEdit()}
                  />

                  {!disableDeleteAction && (
                    <MenuItem
                      text="Delete"
                      icon={TrashIcon}
                      tone="critical"
                      onClick={() => onRemove(name, id)}
                    />
                  )}
                </Menu>
              }
            />
          </Inline>
        </Flex>
      </Flex>

      {isFormOpen && (
        <Dialog
          header="Edit Project Deployment"
          id="update-webhook"
          width={1}
          onClickOutside={() => setIsFormOpen(false)}
          onClose={() => setIsFormOpen(false)}
          footer={
            <Box padding={3}>
              <Grid columns={2} gap={3}>
                <Button
                  padding={4}
                  mode="ghost"
                  text="Cancel"
                  onClick={() => setIsFormOpen(false)}
                />
                <Button
                  padding={4}
                  text="Update"
                  tone="primary"
                  loading={isSubmitting}
                  onClick={() => onSubmitEdit()}
                  disabled={
                    isSubmitting ||
                    !pendingDeploy.cloudflareProject ||
                    !pendingDeploy.cloudflareApiEndpointUrl ||
                    !pendingDeploy.cloudflareAPIKey
                  }
                />
              </Grid>
            </Box>
          }
        >
          <Box padding={4}>
            <Stack space={4}>
              <FormField
                title="Display Title (internal use only)"
                description={
                  <>
                    This should be the environment you are deploying to, like{' '}
                    <em>Production</em> or <em>Staging</em>
                  </>
                }
              >
                <TextInput
                  type="text"
                  value={pendingDeploy.title}
                  onChange={(e) => {
                    e.persist()
                    const title = (e.target as HTMLInputElement).value
                    setpendingDeploy((prevState) => ({
                      ...prevState,
                      ...{ title },
                    }))
                  }}
                />
              </FormField>

              <FormField
                title="Vercel Project Name"
                description={`Vercel Project: Settings → General → "Project Name"`}
              >
                <TextInput
                  type="text"
                  value={pendingDeploy.cloudflareProject}
                  onChange={(e) => {
                    e.persist()
                    const cloudflareProject = (e.target as HTMLInputElement)
                      .value
                    setpendingDeploy((prevState) => ({
                      ...prevState,
                      ...{ cloudflareProject },
                    }))
                  }}
                />
              </FormField>

              <FormField
                title="Deploy Hook URL"
                description={`Vercel Project: Settings → Git → "Deploy Hooks"`}
              >
                <TextInput
                  type="text"
                  inputMode="url"
                  value={pendingDeploy.cloudflareApiEndpointUrl}
                  onChange={(e) => {
                    e.persist()
                    const cloudflareApiEndpointUrl = (
                      e.target as HTMLInputElement
                    ).value
                    setpendingDeploy((prevState) => ({
                      ...prevState,
                      ...{ cloudflareApiEndpointUrl },
                    }))
                  }}
                />
              </FormField>

              <FormField
                title="Cloudflare Email"
                description={`Vercel Project: Settings → Git → "Deploy Hooks"`}
              >
                <TextInput
                  type="text"
                  value={pendingDeploy.cloudflareEmail}
                  onChange={(e) => {
                    e.persist()
                    const cloudflareEmail = (e.target as HTMLInputElement).value
                    setpendingDeploy((prevState) => ({
                      ...prevState,
                      ...{ cloudflareEmail },
                    }))
                  }}
                />
              </FormField>

              <FormField
                title="Cloudflare Key"
                description={`Vercel Project: Settings → Git → "Deploy Hooks"`}
              >
                <TextInput
                  type="text"
                  value={pendingDeploy.cloudflareAPIKey}
                  onChange={(e) => {
                    e.persist()
                    const cloudflareAPIKey = (e.target as HTMLInputElement)
                      .value
                    setpendingDeploy((prevState) => ({
                      ...prevState,
                      ...{ cloudflareAPIKey },
                    }))
                  }}
                />
              </FormField>

              <FormField>
                <Card paddingY={3}>
                  <Flex align="center">
                    <Switch
                      id="disableDeleteAction"
                      style={{ display: 'block' }}
                      onChange={(e) => {
                        e.persist()
                        const isChecked = (e.target as HTMLInputElement).checked

                        setpendingDeploy((prevState) => ({
                          ...prevState,
                          ...{ disableDeleteAction: isChecked },
                        }))
                      }}
                      checked={pendingDeploy.disableDeleteAction}
                    />
                    <Box flex={1} paddingLeft={3}>
                      <Text>
                        <label htmlFor="disableDeleteAction">
                          Disable the "Delete" action for this item in
                          production?
                        </label>
                      </Text>
                    </Box>
                  </Flex>
                </Card>
              </FormField>
            </Stack>
          </Box>
        </Dialog>
      )}

      {isHistoryOpen && (
        <Dialog
          id="deploy-history"
          header={`Deployment History: ${name}`}
          onClickOutside={() => setIsHistoryOpen(false)}
          onClose={() => setIsHistoryOpen(false)}
          width={2}
        >
          <DeployHistory
            _id={_id}
            cloudflareApiEndpointUrl={cloudflareApiEndpointUrl}
            cloudflareProject={cloudflareProject}
            cloudflareAPIKey={cloudflareAPIKey}
            cloudflareEmail={cloudflareEmail}
          />
        </Dialog>
      )}
    </>
  )
}

export default DeployItem
