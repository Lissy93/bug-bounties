<script lang="ts">
  import {
    Shield,
    Database,
    Globe,
    Github,
    Search,
    File,
    Server,
    Code,
    Mail,
    Inbox,
    Lock,
    Home,
    FileSearch,
    FileText,
  } from "lucide-svelte";

  export let icon: string = "Shield";
  export let size: number = 16;

  const icons: Record<string, typeof Shield> = {
    Shield,
    Database,
    Globe,
    Github,
    Search,
    File,
    Server,
    Code,
    Mail,
    Inbox,
    Lock,
    Home,
    FileSearch,
    FileText,
  };

  $: Component = icons[icon] || Shield;
</script>

<svelte:component this={Component} {size} />
