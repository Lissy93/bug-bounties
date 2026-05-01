<script lang="ts">
  import {
    Bug,
    Github,
    Info,
    CodeXml,
    CirclePlus,
    GraduationCap,
    Bookmark,
    Search,
    Bot,
  } from "lucide-svelte";

  interface Props {
    icon: string;
    size?: number;
  }

  const { icon, size = 16 }: Props = $props();

  const icons: Record<string, typeof Github> = {
    Bug,
    Github,
    Info,
    CodeXml,
    CirclePlus,
    GraduationCap,
    Bookmark,
    Search,
    Bot,
  };

  const Component = $derived(icons[icon]);
</script>

{#if Component}
  <Component {size} />
{/if}
