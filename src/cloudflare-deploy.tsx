import axios from 'axios'
import { nanoid } from 'nanoid'
import { useEffect, useState } from 'react'
import { type Subscription } from 'rxjs'

import {
  Box,
  Button,
  Card,
  Container,
  Dialog,
  Flex,
  Grid,
  Spinner,
  Stack,
  studioTheme,
  Switch,
  Text,
  TextInput,
  ThemeProvider,
  ToastProvider,
  useToast,
} from '@sanity/ui'
import { FormField, useColorScheme } from 'sanity'

import DeployItem from './deploy-item'
import { useClient } from './hook/useClient'
import type { SanityDeploySchema } from './types'
import { cloudflarePagesDeployTool } from 'sanity-plugin-cloudflare-pages-deploy'

const initialDeploy = {
  name: '',
  title: '',
  id: '',
  cloudflareApiEndpointUrl: '',
  cloudflareProject: '',
  cloudflareEmail: '',
  cloudflareAPIKey: '',
  disableDeleteAction: false,
}

const VercelDeploy = () => {
  const WEBHOOK_TYPE = 'webhook_deploy'
  const WEBHOOK_QUERY = `*[_type == "${WEBHOOK_TYPE}"] | order(_createdAt)`
  const client = useClient()
  const { scheme } = useColorScheme()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deploys, setDeploys] = useState<SanityDeploySchema[]>([])
  const [pendingDeploy, setpendingDeploy] = useState(initialDeploy)
  const toast = useToast()

  const onSubmit = async () => {
    console.log(pendingDeploy)
    client
      .create({
        // Explicitly define an _id inside the vercel-deploy path to make sure it's not publicly accessible
        // This will protect users' tokens & project info. Read more: https://www.sanity.io/docs/ids
        _id: `vercel-deploy.${nanoid()}`,
        _type: WEBHOOK_TYPE,
        name: pendingDeploy.title,
        cloudflareApiEndpointUrl: pendingDeploy.cloudflareApiEndpointUrl,
        cloudflareProject: pendingDeploy.cloudflareProject,
        cloudflareEmail: pendingDeploy.cloudflareEmail,
        cloudflareAPIKey: pendingDeploy.cloudflareAPIKey,
        disableDeleteAction: pendingDeploy.disableDeleteAction,
      })
      .then(() => {
        toast.push({
          status: 'success',
          title: 'Success!',
          description: `Created Deployment: ${pendingDeploy.title}`,
        })
        setIsFormOpen(false)
        setIsSubmitting(false)
        setpendingDeploy(initialDeploy) // Reset the pending webhook state
      })
  }

  // Fetch all existing webhooks and listen for newly created
  useEffect(() => {
    let webhookSubscription: Subscription

    client.fetch(WEBHOOK_QUERY).then((w) => {
      setDeploys(w)
      setIsLoading(false)

      webhookSubscription = client
        .listen<SanityDeploySchema>(WEBHOOK_QUERY, {}, { includeResult: true })
        .subscribe({
          next: (res) => {
            if (res.type === 'mutation') {
              const wasCreated = res.mutations.some((item) =>
                Object.prototype.hasOwnProperty.call(item, 'create')
              )

              const wasPatched = res.mutations.some((item) =>
                Object.prototype.hasOwnProperty.call(item, 'patch')
              )

              const wasDeleted = res.mutations.some((item) =>
                Object.prototype.hasOwnProperty.call(item, 'delete')
              )

              const filterDeploy = (deploy: SanityDeploySchema) =>
                deploy._id !== res.documentId

              const updateDeploy = (deploy: SanityDeploySchema) =>
                deploy._id === res.documentId
                  ? (res.result as SanityDeploySchema)
                  : deploy

              if (wasCreated) {
                setDeploys((prevState) => {
                  if (res.result) {
                    return [...prevState, res.result]
                  }
                  return prevState
                })
              }
              if (wasPatched) {
                setDeploys((prevState) => {
                  const updatedDeploys = prevState.map(updateDeploy)

                  return updatedDeploys
                })
              }
              if (wasDeleted) {
                setDeploys((prevState) => prevState.filter(filterDeploy))
              }
            }
          },
        })
    })

    return () => {
      if (webhookSubscription) {
        webhookSubscription.unsubscribe()
      }
    }
  }, [WEBHOOK_QUERY, client])

  return (
    <ThemeProvider theme={studioTheme}>
      <ToastProvider>
        <Container display="grid" width={6} style={{ minHeight: '100%' }}>
          <Flex direction="column">
            <Card padding={4} borderBottom>
              <Flex align="center">
                <Flex flex={1} align="center">
                  <Card>
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M16.3862 15.9103L16.5089 15.485C16.6551 14.9791 16.6007 14.5114 16.3554 14.1679C16.1296 13.8514 15.7534 13.665 15.2964 13.6433L6.64219 13.5336C6.61533 13.533 6.58897 13.5262 6.56528 13.5136C6.54151 13.5009 6.52115 13.4829 6.50564 13.4609C6.49054 13.4382 6.48086 13.4122 6.47744 13.3851C6.47411 13.3579 6.47711 13.3304 6.4862 13.3046C6.50105 13.2621 6.52799 13.2249 6.5637 13.1976C6.59948 13.1703 6.64236 13.1541 6.68724 13.1509L15.4216 13.0399C16.4577 12.9923 17.5795 12.1502 17.9723 11.1233L18.4704 9.81958C18.4908 9.76445 18.4955 9.70473 18.4839 9.6471C17.9183 7.09889 15.6478 5.19336 12.9332 5.19336C10.432 5.19336 8.30829 6.81038 7.54652 9.05795C7.03175 8.67094 6.38994 8.49303 5.74979 8.55984C4.54983 8.67919 3.58503 9.6469 3.46624 10.849C3.43579 11.1492 3.45807 11.4524 3.53222 11.7448C1.572 11.8021 0 13.4107 0 15.3881C0.000250252 15.5646 0.0132617 15.7409 0.0389542 15.9155C0.0446266 15.9558 0.0645643 15.9928 0.0951785 16.0196C0.125793 16.0465 0.165083 16.0614 0.205708 16.0616L16.183 16.0636C16.1845 16.0637 16.186 16.0637 16.1875 16.0636C16.2327 16.0628 16.2764 16.0475 16.3122 16.0199C16.348 15.9922 16.3739 15.9538 16.3862 15.9103Z"
                        fill="currentColor"
                      />
                      <path
                        d="M19.267 9.91504C19.1868 9.91504 19.1069 9.91706 19.0273 9.92109C19.0145 9.92201 19.0019 9.92478 18.9899 9.9293C18.969 9.93645 18.9501 9.94854 18.935 9.96457C18.9198 9.98059 18.9087 10.0001 18.9027 10.0213L18.5624 11.1986C18.4161 11.7045 18.4705 12.1718 18.7161 12.5154C18.9417 12.8322 19.3179 13.0182 19.7748 13.0399L21.6197 13.1508C21.6457 13.1517 21.671 13.1586 21.6939 13.171C21.7167 13.1834 21.7363 13.201 21.7511 13.2223C21.7665 13.2452 21.7762 13.2713 21.7796 13.2986C21.783 13.3259 21.7799 13.3537 21.7707 13.3796C21.7558 13.422 21.7289 13.4591 21.6932 13.4864C21.6576 13.5137 21.6147 13.53 21.57 13.5333L19.6531 13.6443C18.6123 13.6923 17.4908 14.534 17.0984 15.5609L16.9599 15.9235C16.9541 15.9386 16.952 15.9549 16.9537 15.9711C16.9555 15.9872 16.961 16.0027 16.9699 16.0163C16.9788 16.0298 16.9908 16.0411 17.0048 16.0492C17.0189 16.0571 17.0348 16.0617 17.051 16.0624C17.0527 16.0624 17.0543 16.0624 17.0561 16.0624H23.652C23.6904 16.0627 23.7278 16.0505 23.7586 16.0275C23.7893 16.0045 23.8117 15.9721 23.8223 15.9352C23.9392 15.5175 23.9982 15.0858 23.9978 14.652C23.9971 12.036 21.8793 9.91504 19.267 9.91504Z"
                        fill="currentColor"
                      />
                    </svg>
                  </Card>
                  <Card marginX={1} style={{ opacity: 0.15 }}>
                    <svg
                      viewBox="0 0 24 24"
                      width="32"
                      height="32"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      shapeRendering="geometricPrecision"
                    >
                      <path d="M16.88 3.549L7.12 20.451" />
                    </svg>
                  </Card>
                  <Card>
                    <Text as="h1" size={2} weight="semibold">
                      Cloudflare Pages Deployments
                    </Text>
                  </Card>
                </Flex>
                <Box>
                  <Button
                    type="button"
                    fontSize={2}
                    tone="primary"
                    padding={3}
                    radius={3}
                    text="Add Project"
                    onClick={() => setIsFormOpen(true)}
                  />
                </Box>
              </Flex>
            </Card>

            <Card flex={1}>
              <Stack as={'ul'}>
                {isLoading ? (
                  <Card as={'li'} padding={4}>
                    <Flex
                      direction="column"
                      align="center"
                      justify="center"
                      paddingTop={3}
                    >
                      <Spinner size={4} />
                      <Box padding={4}>
                        <Text size={2}>loading your deployments...</Text>
                      </Box>
                    </Flex>
                  </Card>
                ) : deploys.length ? (
                  deploys.map((deploy) => (
                    <Card key={deploy._id} as={'li'} padding={4} borderBottom>
                      <DeployItem
                        _id={deploy._id}
                        key={deploy._id}
                        name={deploy.name}
                        id={deploy._id}
                        cloudflareApiEndpointUrl={
                          deploy.cloudflareApiEndpointUrl
                        }
                        cloudflareProject={deploy.cloudflareProject}
                        cloudflareEmail={deploy.cloudflareEmail}
                        cloudflareAPIKey={deploy.cloudflareAPIKey}
                        disableDeleteAction={deploy.disableDeleteAction}
                      />
                    </Card>
                  ))
                ) : (
                  <Card as={'li'} padding={5} paddingTop={6}>
                    <Flex direction="column" align="center" justify="center">
                      <h2 style={{ fontSize: '4rem', margin: 0 }}>☁️</h2>

                      <Flex direction="column" align="center" padding={4}>
                        <Text size={3}>No deployments created yet.</Text>
                        <Box padding={4}>
                          <Button
                            fontSize={2}
                            paddingX={4}
                            paddingY={4}
                            tone="primary"
                            radius={4}
                            text="Add Project"
                            onClick={() => setIsFormOpen(true)}
                          />
                        </Box>

                        <Text size={1} weight="semibold" muted>
                          <a
                            href="https://github.com/ndimatteo/sanity-plugin-vercel-deploy#-your-first-vercel-deployment"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'inherit' }}
                          >
                            Need help?
                          </a>
                        </Text>
                      </Flex>
                    </Flex>
                  </Card>
                )}
              </Stack>
            </Card>
          </Flex>
        </Container>

        {isFormOpen && (
          <Dialog
            header="New Project Deployment"
            id="create-webhook"
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
                    text="Create"
                    tone="primary"
                    loading={isSubmitting}
                    onClick={() => onSubmit()}
                    disabled={
                      isSubmitting ||
                      !pendingDeploy.cloudflareProject ||
                      !pendingDeploy.cloudflareApiEndpointUrl ||
                      !pendingDeploy.cloudflareAPIKey ||
                      !pendingDeploy.cloudflareEmail
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
                  title="Vercel Team Name"
                  description={`Required for projects under a Vercel Team: Settings → General → "Team Name"`}
                >
                  <TextInput
                    type="text"
                    value={pendingDeploy.cloudflareEmail}
                    onChange={(e) => {
                      e.persist()
                      const cloudflareEmail = (e.target as HTMLInputElement)
                        .value
                      setpendingDeploy((prevState) => ({
                        ...prevState,
                        ...{ cloudflareEmail },
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
                  title="Vercel Token"
                  description={`Vercel Account dropdown: Settings → "Tokens"`}
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
                          const isChecked = (e.target as HTMLInputElement)
                            .checked

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
      </ToastProvider>
    </ThemeProvider>
  )
}

export default VercelDeploy
