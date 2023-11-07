<script lang="ts">

  import { onMount } from 'svelte';

  export const props = {
    project: 'Bug Bounties',
    projectUrl: 'https://github.com/Lissy93/bug-bounties',
    license: 'MIT',
    licenseUrl: 'https://github.com/Lissy93/bug-bounties/blob/main/LICENSE',
    author: 'Alicia Sykes',
    authorUrl: 'https://aliciasykes.com',
    date: new Date().getFullYear() || 2023,
    copyrightSymbol: '©',
    fillerText: 'is licensed under',
  };

  let footerPosition = 'relative';

  // If content more than 100% footer should be relative, else fixed
  const checkHeight = () =>  {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const bodyHeight = document.body.offsetHeight;
      const windowHeight = window.innerHeight;
      footerPosition = bodyHeight > windowHeight ? 'relative' : 'fixed';
    }
  }

  // Initiate the height check after load and on page resize
  onMount(() => {
    if (!window) return;
    checkHeight();
    window.addEventListener('resize', checkHeight);
    return () => {
      window.removeEventListener('resize', checkHeight);
    };
  });
</script>

<footer style="--footer-position: {footerPosition};">
  <a href={props.projectUrl}>{props.project}</a>
  {props.fillerText}
  <a href={props.licenseUrl}>{props.license}</a>,
  {props.copyrightSymbol}
  <a href={props.authorUrl}>{props.author}</a>
  {props.date}
</footer>

<style lang="scss">
  footer {
    width: 100vw;
    margin: 2rem auto 0 auto;
    background: var(--background-lighter);
    text-align: center;
    color: var(--foreground);
    padding: 0.5rem 0;
    bottom: 0;
    position: var(--footer-position, relative);
    box-shadow: 0 -1px 2px var(--background-darker);
    a {
      color: var(--primary);
      &:hover {
        filter: brightness(1.25);
      }
    }
  }
</style>
