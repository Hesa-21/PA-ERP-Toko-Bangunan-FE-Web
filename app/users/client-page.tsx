"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { UserCheck, Plus } from "lucide-react"
import { PermissionGate } from "@/components/permission-gate"
import { ALL_BRANCHES } from "@/lib/single-branch"
import { UsersFiltersBar } from "@/app/users/_components/users-filters-bar"
import { UsersTable } from "@/app/users/_components/users-table"
import { CreateUserDialog } from "@/app/users/_components/create-user-dialog"
import { EditUserDialog } from "@/app/users/_components/edit-user-dialog"
import { DeleteUserDialog } from "@/app/users/_components/delete-user-dialog"
import { useUsersPage } from "@/app/users/_hooks/use-users-page"

export default function UsersClientPage() {
  const {
    branchNameByCode,
    users,
    loading,
    loadError,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalPages,
    isMutating,
    isCreating,
    isSavingEdit,
    isSettingPassword,
    isDeleting,
    openCreate,
    setOpenCreate,
    openEdit,
    setOpenEdit,
    openDelete,
    setOpenDelete,
    deletingUser,
    setDeletingUser,
    cName,
    setCName,
    cEmail,
    setCEmail,
    cPassword,
    setCPassword,
    cShowPassword,
    setCShowPassword,
    cRole,
    setCRole,
    cBranch,
    setCBranch,
    eName,
    setEName,
    eEmail,
    setEEmail,
    eActive,
    setEActive,
    eNewPassword,
    setENewPassword,
    eConfirmPassword,
    setEConfirmPassword,
    eShowNewPassword,
    setEShowNewPassword,
    eShowConfirmPassword,
    setEShowConfirmPassword,
    openEditDialog,
    createUser,
    saveEdit,
    setNewPassword,
    confirmDelete,
  } = useUsersPage()

  return (
    <PermissionGate module="users">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <DashboardHeader />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="h-4" />

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Manajemen Pengguna
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setOpenCreate(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Pengguna
                    </Button>
                  </div>
                </div>

                <UsersFiltersBar
                  searchTerm={searchTerm}
                  onSearchTermChange={setSearchTerm}
                  roleFilter={roleFilter}
                  onRoleFilterChange={(value) => {
                    setPage(1)
                    setRoleFilter(value)
                  }}
                  statusFilter={statusFilter}
                  onStatusFilterChange={(value) => {
                    setPage(1)
                    setStatusFilter(value)
                  }}
                />
              </CardHeader>
              <CardContent>
                {loadError && (
                  <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Gagal memuat data terbaru: {loadError}
                  </div>
                )}

                <UsersTable
                  users={users}
                  branchNameByCode={branchNameByCode}
                  disabledActions={isMutating}
                  onEdit={openEditDialog}
                  onDelete={(user) => {
                    setDeletingUser(user)
                    setOpenDelete(true)
                  }}
                />

                {!loading && users.length === 0 && (
                  <div className="text-center py-8 text-gray-500">Tidak ada data yang sesuai dengan filter</div>
                )}

                {(() => {
                  const canPrev = page > 1
                  const canNext = page < totalPages

                  return (
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div className="text-sm text-gray-500">
                        Halaman {page} dari {totalPages}
                      </div>
                      <Pagination className="justify-end">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              className={!canPrev ? "pointer-events-none opacity-50" : undefined}
                              onClick={(e) => {
                                e.preventDefault()
                                if (!canPrev) return
                                setPage((p) => Math.max(1, p - 1))
                              }}
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              className={!canNext ? "pointer-events-none opacity-50" : undefined}
                              onClick={(e) => {
                                e.preventDefault()
                                if (!canNext) return
                                setPage((p) => p + 1)
                              }}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            <CreateUserDialog
              open={openCreate}
              onOpenChange={setOpenCreate}
              name={cName}
              email={cEmail}
              password={cPassword}
              showPassword={cShowPassword}
              role={cRole}
              branch={cBranch}
              branches={ALL_BRANCHES}
              onNameChange={setCName}
              onEmailChange={setCEmail}
              onPasswordChange={setCPassword}
              onToggleShowPassword={() => setCShowPassword((v) => !v)}
              onRoleChange={(value) => setCRole(value)}
              onBranchChange={setCBranch}
              isSubmitting={isCreating}
              onSubmit={createUser}
            />

            <EditUserDialog
              open={openEdit}
              onOpenChange={setOpenEdit}
              name={eName}
              email={eEmail}
              active={eActive}
              newPassword={eNewPassword}
              confirmPassword={eConfirmPassword}
              showNewPassword={eShowNewPassword}
              showConfirmPassword={eShowConfirmPassword}
              onNameChange={setEName}
              onEmailChange={setEEmail}
              onActiveChange={setEActive}
              onNewPasswordChange={setENewPassword}
              onConfirmPasswordChange={setEConfirmPassword}
              onToggleShowNewPassword={() => setEShowNewPassword((v) => !v)}
              onToggleShowConfirmPassword={() => setEShowConfirmPassword((v) => !v)}
              isSaving={isSavingEdit}
              isSettingPassword={isSettingPassword}
              onSave={saveEdit}
              onSetNewPassword={setNewPassword}
            />

            <DeleteUserDialog
              open={openDelete}
              user={deletingUser}
              onOpenChange={(open) => {
                setOpenDelete(open)
                if (!open) setDeletingUser(null)
              }}
              isSubmitting={isDeleting}
              onConfirm={confirmDelete}
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PermissionGate>
  )
}
