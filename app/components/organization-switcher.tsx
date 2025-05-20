import { useAuth } from '@workos-inc/authkit-react'
import { WorkOsWidgets, OrganizationSwitcher } from '@workos-inc/widgets'

export function OrganizationSwitcherWrapper() {
  const { getAccessToken, switchToOrganization } = useAuth()

  return (
    <WorkOsWidgets>
      <OrganizationSwitcher authToken={getAccessToken} switchToOrganization={switchToOrganization} />
    </WorkOsWidgets>
  )
}
