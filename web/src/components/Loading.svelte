<script lang="ts">
  export let label: string = "Loading";
</script>

<div class="loader" role="status" aria-label={label}>
  <div class="dots">
    <span></span><span></span><span></span>
  </div>
  <p>{label}</p>
</div>

<style>
  .loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 3rem 1rem;
    color: var(--muted, #ffffff60);
    font-size: 1.2rem;
    background: var(--background-lighter);
    max-width: var(--content-width);
    width: 100%;
    margin: 2rem auto;
    border-radius: var(--curve);
    box-shadow: var(--shadow);
  }
  .dots {
    display: flex;
    gap: 0.5rem;
  }
  .dots span {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--primary, #fdc500);
    animation: pulse 1.2s ease-in-out infinite;
  }
  .dots span:nth-child(2) {
    animation-delay: 0.15s;
  }
  .dots span:nth-child(3) {
    animation-delay: 0.3s;
  }
  @keyframes pulse {
    0%,
    80%,
    100% {
      opacity: 0.2;
      transform: scale(0.8);
    }
    40% {
      opacity: 1;
      transform: scale(1);
    }
  }
  p {
    margin: 0;
  }
</style>
