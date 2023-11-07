<script lang="ts">
  import Icon from '../components/Icon.svelte';
</script>

<header>
  <div class="title-and-icon">
    <img src="/favicon.png" alt="Bug Bounties" />
    <h1>Bug Bounties</h1>
  </div>
  <p class="subtitle">A compiled list of companies which accept responsible disclosure</p>

  <a class="github-link" href="https://github.com/lissy93/bug-bounties">
    <Icon name="github" />
    View / Edit on GitHub
  </a>
<!-- 
  <div class="links">
    <a href="/how-to-report">
      <Icon name="finding-vulnerabilities" />
      Identifying Security Issues
    </a>
    <a href="/how-to-report">
      <Icon name="how-report" />
      Reporting Vulnerabilities
    </a>
    <a href="/how-to-report">
      <Icon name="legal-considerations" />
      Legal Considerations
    </a>
  </div> -->
</header>



<style lang="scss">
header {
  display: flex;
  flex-direction: column;
  background: var(--background-lighter);
  width: 90%;
  margin: 2rem auto;
  border-radius: var(--curve-factor);
  box-shadow: 2px 2px 1px var(--background-darker);
  
  .title-and-icon {
    padding: 1rem;
    width: calc(100vw - 2rem);
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    width: 100%;
    img {
      width: 5rem;
    }
    h1 {
      font-size: 5rem;
      margin: 0;
      text-align: center;
      color: var(--primary);
    }
  }

  .subtitle {
    text-align: center;
    color: var(--primary);
    font-family: Roboto;
    font-size: 1.2rem;
    margin: 1rem auto;
  }

  .github-link {
      font-family: Roboto;
      border: 2px solid var(--primary);
      padding: 0.25rem 0.5rem;
      font-size: 1.4rem;
      border-radius: var(--curve-factor);
      color: var(--primary);
      text-decoration: none;
      transition: 0.2s all ease-in-out;
      text-align: center;
      margin: 1rem auto;
      &:hover {
        background: var(--primary);
        color: var(--background);
      }
    }

  .links {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin: 2rem auto;
    flex-wrap: wrap;
    a {
      color: var(--primary);
      text-decoration: none;
      transition: 0.2s all ease-in-out;
      &:hover {
        text-decoration: underline;
      }
    }

  }
}
</style>
