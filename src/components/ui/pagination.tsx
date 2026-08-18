import * as React from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'

function Pagination({
  className,
  'aria-label': ariaLabel = 'pagination',
  ...props
}: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label={ariaLabel}
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
  isDisabled?: boolean
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
  React.ComponentProps<'a'>

function PaginationLink({
  className,
  isActive,
  isDisabled,
  size = 'icon',
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      data-disabled={isDisabled}
      className={cn(
        buttonVariants({
          variant: isActive ? 'outline' : 'ghost',
          size,
        }),
        isDisabled && 'pointer-events-none opacity-50',
        className,
      )}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  isDisabled,
  ariaLabel = 'Go to previous page',
  label = 'Previous',
  ...props
}: React.ComponentProps<typeof PaginationLink> & {
  ariaLabel?: string
  label?: string
}) {
  return (
    <PaginationLink
      aria-label={ariaLabel}
      size="default"
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      isDisabled={isDisabled}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">{label}</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  isDisabled,
  ariaLabel = 'Go to next page',
  label = 'Next',
  ...props
}: React.ComponentProps<typeof PaginationLink> & {
  ariaLabel?: string
  label?: string
}) {
  return (
    <PaginationLink
      aria-label={ariaLabel}
      size="default"
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      isDisabled={isDisabled}
      {...props}
    >
      <span className="hidden sm:block">{label}</span>
      <ChevronRightIcon />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  label = 'More pages',
  ...props
}: React.ComponentProps<'span'> & { label?: string }) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

const defaultLabels = {
  previous: 'Previous',
  next: 'Next',
  goToPrevious: 'Go to previous page',
  goToNext: 'Go to next page',
  morePages: 'More pages',
  nav: 'pagination',
}

const PaginationComponent: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  baseUrl,
  labels = defaultLabels,
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  const normalizedBaseUrl = baseUrl === '/' ? '' : baseUrl.replace(/\/+$/, '')

  const getPageUrl = (page: number) => {
    if (page === 1) return normalizedBaseUrl || '/'
    return `${normalizedBaseUrl}/${page}`
  }

  return (
    <Pagination aria-label={labels.nav}>
      <PaginationContent className="flex-wrap">
        <PaginationItem>
          <PaginationPrevious
            href={currentPage > 1 ? getPageUrl(currentPage - 1) : undefined}
            isDisabled={currentPage === 1}
            ariaLabel={labels.goToPrevious}
            label={labels.previous}
          />
        </PaginationItem>

        {pages.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink
              href={getPageUrl(page)}
              isActive={page === currentPage}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}

        {totalPages > 5 && (
          <PaginationItem>
            <PaginationEllipsis label={labels.morePages} />
          </PaginationItem>
        )}

        <PaginationItem>
          <PaginationNext
            href={
              currentPage < totalPages ? getPageUrl(currentPage + 1) : undefined
            }
            isDisabled={currentPage === totalPages}
            ariaLabel={labels.goToNext}
            label={labels.next}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

interface PaginationProps {
  currentPage: number
  totalPages: number
  baseUrl: string
  labels?: {
    previous: string
    next: string
    goToPrevious: string
    goToNext: string
    morePages: string
    nav: string
  }
}

export default PaginationComponent

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
