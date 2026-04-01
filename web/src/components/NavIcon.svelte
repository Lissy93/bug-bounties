<script lang="ts">
  import {
    Github,
    Info,
    CodeXml,
    CirclePlus,
    GraduationCap,
    Bookmark,
    Search,
  } from "lucide-svelte";

  interface Props {
    icon: string;
    size?: number;
  }

  const { icon, size = 16 }: Props = $props();

  const icons: Record<string, typeof Github> = {
    Github,
    Info,
    CodeXml,
    CirclePlus,
    GraduationCap,
    Bookmark,
    Search,
  };

  const Component = $derived(icons[icon]);
</script>

{#if Component}
  <Component {size} />
{/if}
