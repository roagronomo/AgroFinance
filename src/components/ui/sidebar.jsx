/* sidebar-rebuild-2026-03-03 */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

var SIDEBAR_COOKIE_NAME = "sidebar_state"
var SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
var SIDEBAR_WIDTH = "16rem"
var SIDEBAR_WIDTH_MOBILE = "18rem"
var SIDEBAR_WIDTH_ICON = "3rem"
var SIDEBAR_KEYBOARD_SHORTCUT = "b"

var SidebarContext = React.createContext(null)

function useSidebar() {
  var context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return context
}

var SidebarProvider = React.forwardRef(function SidebarProvider(allProps, ref) {
  var defaultOpen = allProps.defaultOpen !== undefined ? allProps.defaultOpen : true
  var openProp = allProps.open
  var setOpenProp = allProps.onOpenChange
  var className = allProps.className
  var style = allProps.style
  var children = allProps.children
  var rest = Object.assign({}, allProps)
  delete rest.defaultOpen
  delete rest.open
  delete rest.onOpenChange
  delete rest.className
  delete rest.style
  delete rest.children

  var isMobile = useIsMobile()
  var openMobileState = React.useState(false)
  var openMobile = openMobileState[0]
  var setOpenMobile = openMobileState[1]
  var internalOpenState = React.useState(defaultOpen)
  var _open = internalOpenState[0]
  var _setOpen = internalOpenState[1]
  var open = openProp !== undefined ? openProp : _open

  var setOpen = React.useCallback(function(value) {
    var openState = typeof value === "function" ? value(open) : value
    if (setOpenProp) {
      setOpenProp(openState)
    } else {
      _setOpen(openState)
    }
    document.cookie = SIDEBAR_COOKIE_NAME + "=" + openState + "; path=/; max-age=" + SIDEBAR_COOKIE_MAX_AGE
  }, [setOpenProp, open])

  var toggleSidebar = React.useCallback(function() {
    if (isMobile) {
      setOpenMobile(function(o) { return !o })
    } else {
      setOpen(function(o) { return !o })
    }
  }, [isMobile, setOpen, setOpenMobile])

  React.useEffect(function() {
    function handleKeyDown(event) {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return function() { window.removeEventListener("keydown", handleKeyDown) }
  }, [toggleSidebar])

  var state = open ? "expanded" : "collapsed"

  var contextValue = React.useMemo(function() {
    return { state: state, open: open, setOpen: setOpen, isMobile: isMobile, openMobile: openMobile, setOpenMobile: setOpenMobile, toggleSidebar: toggleSidebar }
  }, [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar])

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          ref={ref}
          style={Object.assign({ "--sidebar-width": SIDEBAR_WIDTH, "--sidebar-width-icon": SIDEBAR_WIDTH_ICON }, style)}
          className={cn("group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar", className)}
          {...rest}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
})
SidebarProvider.displayName = "SidebarProvider"

var Sidebar = React.forwardRef(function Sidebar(allProps, ref) {
  var side = allProps.side !== undefined ? allProps.side : "left"
  var variant = allProps.variant !== undefined ? allProps.variant : "sidebar"
  var collapsible = allProps.collapsible !== undefined ? allProps.collapsible : "offcanvas"
  var className = allProps.className
  var children = allProps.children
  var rest = Object.assign({}, allProps)
  delete rest.side
  delete rest.variant
  delete rest.collapsible
  delete rest.className
  delete rest.children

  var ctx = useSidebar()
  var isMobile = ctx.isMobile
  var state = ctx.state
  var openMobile = ctx.openMobile
  var setOpenMobile = ctx.setOpenMobile

  if (collapsible === "none") {
    return (
      <div
        ref={ref}
        className={cn("flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground", className)}
        {...rest}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...rest}>
        <SheetContent
          data-sidebar="sidebar"
          data-mobile="true"
          className="w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE }}
          side={side}
        >
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      ref={ref}
      className="group peer hidden text-sidebar-foreground md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
    >
      <div
        className={cn(
          "relative h-svh w-[--sidebar-width] bg-transparent transition-[width] duration-200 ease-linear",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
            : "group-data-[collapsible=icon]:w-[--sidebar-width-icon]"
        )}
      />
      <div
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] duration-200 ease-linear md:flex",
          side === "left"
            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
            : "group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className
        )}
        {...rest}
      >
        <div
          data-sidebar="sidebar"
          className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
        >
          {children}
        </div>
      </div>
    </div>
  )
})
Sidebar.displayName = "Sidebar"

var SidebarTrigger = React.forwardRef(function SidebarTrigger(allProps, ref) {
  var className = allProps.className
  var onClick = allProps.onClick
  var rest = Object.assign({}, allProps)
  delete rest.className
  delete rest.onClick

  var ctx = useSidebar()
  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={function(event) {
        if (onClick) onClick(event)
        ctx.toggleSidebar()
      }}
      {...rest}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

var SidebarRail = React.forwardRef(function SidebarRail(allProps, ref) {
  var className = allProps.className
  var rest = Object.assign({}, allProps)
  delete rest.className

  var ctx = useSidebar()
  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={ctx.toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      )}
      {...rest}
    />
  )
})
SidebarRail.displayName = "SidebarRail"

var SidebarInset = React.forwardRef(function SidebarInset(allProps, ref) {
  var className = allProps.className
  var rest = Object.assign({}, allProps)
  delete rest.className
  return (
    <main
      ref={ref}
      className={cn(
        "relative flex min-h-svh flex-1 flex-col bg-background",
        "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
        className
      )}
      {...rest}
    />
  )
})
SidebarInset.displayName = "SidebarInset"

var SidebarInput = React.forwardRef(function SidebarInput(allProps, ref) {
  var className = allProps.className
  var rest = Object.assign({}, allProps)
  delete rest.className
  return (
    <Input
      ref={ref}
      data-sidebar="input"
      className={cn("h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring", className)}
      {...rest}
    />
  )
})
SidebarInput.displayName = "SidebarInput"

var SidebarHeader = React.forwardRef(function SidebarHeader(allProps, ref) {
  var className = allProps.className
  var rest = Object.assign({}, allProps)
  delete rest.className
  return <div ref={ref} data-sidebar="header" className={cn("flex flex-col gap-2 p-2", className)} {...rest} />
})
SidebarHeader.displayName = "SidebarHeader"

var SidebarFooter = React.forwardRef(function SidebarFooter(allProps, ref) {
  var className = allProps.className
  var rest = Object.assign({}, allProps)
  delete rest.className
  return <div ref={ref} data-sidebar="footer" className={cn("flex flex-col gap-2 p-2", className)} {...rest} />
})
SidebarFooter.displayName = "SidebarFooter"

var SidebarSeparator = React.forwardRef(function SidebarSeparator(allProps, ref) {
  var className = allProps.className
  var rest = Object.assign({}, allProps)
  delete rest.className
  return (
    <Separator ref={ref} data-sidebar="separator" className={cn("mx-2 w-auto bg-sidebar-border", className)} {...rest} />
  )
})
SidebarSeparator.displayName = "SidebarSeparator"

var SidebarContent = React.forwardRef(function SidebarContent(allProps, ref) {
  var className = allProps.className
  var rest = Object.assign({}, allProps)
  delete rest.className
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden", className)}
      {...rest}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

var SidebarGroup = React.forwardRef(function SidebarGroup(allProps, ref) {
  var className = allProps.className
  var rest = Object.assign({}, allProps)
  delete rest.className
  return (
    <div ref={ref} data-sidebar="group" className={cn("relative flex w-full min-w-0 flex-col p-2", className)} {...rest} />
  )
})
SidebarGroup.displayName = "SidebarGroup"

var SidebarGroupLabel = React.forwardRef(function SidebarGroupLabel(allProps, ref) {
  var className = allProps.className
  var asChild = allProps.asChild !== undefined ? allProps.asChild : false
  var rest = Object.assign({}, allProps)
  delete rest.className
  delete rest.asChild
  var Comp = asChild ? Slot : "div"
  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      )}
      {...rest}
    />
  )
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

var SidebarGroupAction = React.forwardRef(function SidebarGroupAction(allProps, ref) {
  var className = allProps.className
  var asChild = allProps.asChild !== undefined ? allProps.asChild : false
  var rest = Object.assign({}, allProps)
  delete rest.className
  delete rest.asChild
  var Comp = asChild ? Slot : "button"
  return (
    <Comp
      ref={ref}
      data-sidebar="group-action"
      className={cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 after:md:hidden",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...rest}
    />
  )
})
SidebarGroupAction.displayName = "SidebarGroupAction"

var SidebarGroupContent = React.forwardRef(function SidebarGroupContent(allProps, ref) {
  var className = allProps.className
  var rest = Object.assign({}, allProps)
  delete rest.className
  return <div ref={ref} data-sidebar="group-content" className={cn("w-full text-sm", className)} {...rest} />
})
SidebarGroupContent.displayName = "SidebarGroupContent"

var SidebarMenu = React.forwardRef(function SidebarMenu(allProps, ref) {
  var className = allProps.className
  var rest = Object.assign({}, allProps)
  delete rest.className
  return (
    <ul ref={ref} data-sidebar="menu" className={cn("flex w-full min-w-0 flex-col gap-1", className)} {...rest} />
  )
})
SidebarMenu.displayName = "SidebarMenu"

var SidebarMenuItem = React.forwardRef(function SidebarMenuItem(allProps, ref) {
  var className = allProps.className
  var rest = Object.assign({}, allProps)
  delete rest.className
  return (
    <li ref={ref} data-sidebar="menu-item" className={cn("group/menu-item relative", className)} {...rest} />
  )
})
SidebarMenuItem.displayName = "SidebarMenuItem"

var sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline: "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

var SidebarMenuButton = React.forwardRef(function SidebarMenuButton(allProps, ref) {
  var asChild = allProps.asChild !== undefined ? allProps.asChild : false
  var isActive = allProps.isActive !== undefined ? allProps.isActive : false
  var variant = allProps.variant !== undefined ? allProps.variant : "default"
  var size = allProps.size !== undefined ? allProps.size : "default"
  var tooltip = allProps.tooltip
  var className = allProps.className
  var rest = Object.assign({}, allProps)
  delete rest.asChild
  delete rest.isActive
  delete rest.variant
  delete rest.size
  delete rest.tooltip
  delete rest.className

  var Comp = asChild ? Slot : "button"
  var ctx = useSidebar()
  var isMobile = ctx.isMobile
  var state = ctx.state

  var button = (
    <Comp
      ref={ref}
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant: variant, size: size }), className)}
      {...rest}
    />
  )

  if (!tooltip) {
    return button
  }

  var tooltipProps = typeof tooltip === "string" ? { children: tooltip } : tooltip

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center" hidden={state !== "collapsed" || isMobile} {...tooltipProps} />
    </Tooltip>
  )
})
SidebarMenuButton.displayName = "SidebarMenuButton"

var SidebarMenuAction = React.forwardRef(function SidebarMenuAction(allProps, ref) {
  var className = allProps.className
  var asChild = allProps.asChild !== undefined ? allProps.asChild : false
  var showOnHover = allProps.showOnHover !== undefined ? allProps.showOnHover : false
  var rest = Object.assign({}, allProps)
  delete rest.className
  delete rest.asChild
  delete rest.showOnHover
  var Comp = asChild ? Slot : "button"
  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 after:md:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover && "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      )}
      {...rest}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

var SidebarMenuBadge = React.forwardRef(function SidebarMenuBadge(allProps, ref) {
  var className = allProps.className
  var rest = Object.assign({}, allProps)
  delete rest.className
  return (
    <div
      ref={ref}
      data-sidebar="menu-badge"
      className={cn(
        "pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...rest}
    />
  )
})
SidebarMenuBadge.displayName = "SidebarMenuBadge"

var SidebarMenuSkeleton = React.forwardRef(function SidebarMenuSkeleton(allProps, ref) {
  var className = allProps.className
  var showIcon = allProps.showIcon !== undefined ? allProps.showIcon : false
  var rest = Object.assign({}, allProps)
  delete rest.className
  delete rest.showIcon
  var width = React.useMemo(function() {
    return Math.floor(Math.random() * 40) + 50 + "%"
  }, [])
  return (
    <div ref={ref} data-sidebar="menu-skeleton" className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)} {...rest}>
      {showIcon && <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />}
      <Skeleton className="h-4 max-w-[--skeleton-width] flex-1" data-sidebar="menu-skeleton-text" style={{ "--skeleton-width": width }} />
    </div>
  )
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

var SidebarMenuSub = React.forwardRef(function SidebarMenuSub(allProps, ref) {
  var className = allProps.className
  var rest = Object.assign({}, allProps)
  delete rest.className
  return (
    <ul
      ref={ref}
      data-sidebar="menu-sub"
      className={cn(
        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...rest}
    />
  )
})
SidebarMenuSub.displayName = "SidebarMenuSub"

var SidebarMenuSubItem = React.forwardRef(function SidebarMenuSubItem(allProps, ref) {
  return <li ref={ref} {...allProps} />
})
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

var SidebarMenuSubButton = React.forwardRef(function SidebarMenuSubButton(allProps, ref) {
  var asChild = allProps.asChild !== undefined ? allProps.asChild : false
  var size = allProps.size !== undefined ? allProps.size : "md"
  var isActive = allProps.isActive
  var className = allProps.className
  var rest = Object.assign({}, allProps)
  delete rest.asChild
  delete rest.size
  delete rest.isActive
  delete rest.className
  var Comp = asChild ? Slot : "a"
  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...rest}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}