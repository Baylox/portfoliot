/** Une étude de cas de la page /lab — texte bilingue, extraits de code réels. */
export interface LabSection {
  heading: string;
  body: string;
  code?: string;
  lang?: string;
}

export interface LabStudy {
  title: string;
  intro: string;
  sections: LabSection[];
  /** La métrique ou décision à retenir, en une ligne. */
  highlight: string;
}

export interface LabPage {
  title: string;
  lede: string;
  back: string;
  studies: LabStudy[];
}

// Études d'architecture back-end tirées de projets Symfony réels — chaque
// extrait est du code de production (alda-support), pas une illustration.
export const LAB_FR: LabPage = {
  title: 'Lab',
  lede: `Quatre décisions d'architecture back-end, extraites de mes projets Symfony. Le code montré tourne en production.`,
  back: 'Retour au portfolio',
  studies: [
    {
      title: `Le flux d'une requête : DTO → Controller → Service → Repository`,
      intro: `La règle que je m'impose : un controller ne décide de rien. Il traduit une requête HTTP en intention métier, délègue, puis traduit la réponse. Toute la logique vit dans une couche service, derrière une interface.`,
      sections: [
        {
          heading: `Le controller ne fait que router`,
          body: `Ce controller d'alda-support est mono-action (invokable), final, et dépend d'interfaces — jamais d'une implémentation concrète. Il valide le formulaire, appelle le service, et choisit la réponse selon le contexte (fragment Turbo Stream ou redirection classique). Aucune règle métier ici : la réservation du call, c'est l'affaire du service.`,
          code: `#[Route('/prospects/{id<\\d+>}/reserver-call', name: 'app_relance_reserver_call', methods: ['POST'])]
final class ReserverCallController extends AbstractController
{
    public function __invoke(
        int $id,
        Request $request,
        RelanceServiceInterface $relances,
        ProspectFicheViewProviderInterface $ficheProvider,
    ): Response {
        $dto = new ReserverCallDTO();
        $form = $this->createForm(ReserverCallType::class, $dto);
        $form->handleRequest($request);

        if (!$form->isSubmitted() || !$form->isValid()) {
            return $this->render('relance/_mini_form_call.html.twig', [
                'form' => $form,
            ], new Response(status: Response::HTTP_UNPROCESSABLE_ENTITY));
        }

        $relances->reserverCall($id, $dto);
        // … puis Turbo Stream ou redirection selon le contexte.
    }
}`,
          lang: `php`,
        },
        {
          heading: `Le service dépend d'abstractions, pas de Doctrine`,
          body: `Le repository est défini par une interface : le service parle à CallRepositoryInterface, jamais au repository Doctrine concret. Cette inversion de dépendance rend le service testable sans base de données, et le jour où le stockage change, le contrat reste. Les méthodes portent des noms métier (trouver, planifiesEntre, sauvegarder), pas des noms de framework.`,
          code: `interface CallRepositoryInterface
{
    public function trouver(int $id): ?Call;

    /**
     * Calls planifiés dans l'intervalle [debut, fin) et sans résultat saisi.
     *
     * @return list<Call>
     */
    public function planifiesEntre(\\DateTimeImmutable $debut, \\DateTimeImmutable $fin): array;

    public function sauvegarder(Call $call): void;
}`,
          lang: `php`,
        },
      ],
      highlight: `Un controller final, invokable, qui n'injecte que des interfaces : le test du controller ne touche jamais la base de données.`,
    },
    {
      title: `Un découpage par domaine, pas par type technique`,
      intro: `La plupart des projets Symfony rangent tout par couche : un dossier Controller/, un dossier Entity/, un dossier Repository/. J'ai fait l'inverse : je range par domaine métier, et chaque domaine contient sa propre pile complète.`,
      sections: [
        {
          heading: `Chaque domaine est autonome`,
          body: `Dans alda-support, src/ n'a pas de dossier Controller/ global. Il a des domaines — Call, Infopreneur, Prospect, Relance, Vente — et chacun porte sa chaîne : Dto, Controller, Service (+ Interface), Repository (+ Interface), Entity, Enum, Exception, View/Provider. Ouvrir un dossier, c'est voir tout ce qui concerne un concept métier, sans sauter entre sept répertoires.`,
          code: `src/Call/
├── Controller/      ReserverCallController, CallResultatController
├── Dto/             ReserverCallDTO, ResultatCallDTO
├── Entity/          Call
├── Enum/            ResultatCall
├── Exception/       CallIntrouvable
├── Form/            ReserverCallType, ResultatCallType
├── Provider/        CallResultatViewProvider (+ Interface)
├── Repository/      CallRepository (+ Interface)
├── Service/         CallService (+ Interface)
└── View/            CallDuJourView, CallResultatView`,
          lang: `text`,
        },
        {
          heading: `Ce que ça change concrètement`,
          body: `Une évolution métier — « ajouter une modalité de paiement » — touche un seul dossier. Les frontières entre domaines sont explicites : quand le domaine Call a besoin du domaine Prospect, il passe par une interface exposée (ProspectFicheViewProviderInterface), pas par un accès direct à ses entités. C'est du Clean Architecture appliqué à l'échelle d'un CRM réel, pas d'un exemple de blog.`,
        },
      ],
      highlight: `Cinq domaines métier, chacun avec sa pile complète Dto → Controller → Service → Repository. On lit le métier dans l'arborescence.`,
    },
    {
      title: `Deux frontières de validation : la saisie sur le DTO, les invariants dans le domaine`,
      intro: `Une entité Doctrine ne doit jamais être remplie directement par un formulaire. La validation se joue à deux niveaux : le DTO vérifie la forme de la saisie, le service protège les règles métier. Ce n'est pas l'un ou l'autre — c'est une défense en profondeur.`,
      sections: [
        {
          heading: `Première frontière : le DTO valide la saisie`,
          body: `Ce DTO d'alda-support capture le résultat d'un call. Les contraintes simples sont des attributs (#[Assert\\Positive]), mais la vraie valeur est la validation contextuelle : un montant n'est requis que si le résultat est « Vendu », une date de relance que si c'est un « Follow-up ». Cette validation se déclenche dans le controller, via isValid(), avant même que le service soit appelé — le domaine ne reçoit jamais une saisie malformée.`,
          code: `final class ResultatCallDTO
{
    #[Assert\\NotNull(message: 'Comment ça s\\'est terminé ?')]
    public ?ResultatCall $resultat = null;

    #[Assert\\Positive(message: 'Le montant vendu doit être positif.')]
    public ?int $montant = null;

    #[Assert\\Callback]
    public function validerSelonResultat(ExecutionContextInterface $context): void
    {
        if (ResultatCall::Vendu === $this->resultat && null === $this->montant) {
            $context->buildViolation('Indique le montant vendu.')
                ->atPath('montant')->addViolation();
        }
    }
}`,
          lang: `php`,
        },
        {
          heading: `Seconde frontière : le domaine protège ses invariants`,
          body: `Une saisie bien formée n'est pas une action légitime. Ces règles-là — on ne saisit pas deux fois le résultat d'un call, on ne vend pas sans offre active — ne peuvent pas vivre sur le DTO : elles dépendent de l'état du système, pas du formulaire. Le service les vérifie et lève des exceptions métier typées, visibles dès le contrat. Le DTO ne fait pas confiance à l'utilisateur ; le domaine ne fait pas confiance à l'appelant.`,
          code: `interface CallServiceInterface
{
    /**
     * Enregistre le résultat d'un call et déroule le workflow associé :
     * VENDU → Vente + échéancier · FOLLOW_UP → statut + relance obligatoire ·
     * NO_SHOW → statut + relance auto demain 9h.
     *
     * @throws \\App\\Call\\Exception\\CallIntrouvable
     * @throws \\App\\Vente\\Exception\\VenteImpossibleSansOffre
     * @throws \\DomainException si le résultat a déjà été saisi
     */
    public function enregistrerResultat(int $callId, ResultatCallDTO $dto): Call;
}`,
          lang: `php`,
        },
      ],
      highlight: `« Montant obligatoire si vendu » vit sur le DTO ; « pas de résultat saisi deux fois » vit dans le service. Deux frontières, deux responsabilités.`,
    },
    {
      title: `Ce qui entoure le code : tests, qualité, reproductibilité`,
      intro: `Une architecture propre ne vaut que si elle tient dans le temps. Sur mes projets Symfony, l'outillage n'est pas une option ajoutée après coup.`,
      sections: [
        {
          heading: `Exceptions métier, pas de codes de retour`,
          body: `Le domaine signale ses erreurs par des exceptions typées et nommées — CallIntrouvable, VenteImpossibleSansOffre — pas par des null ou des booléens. Le controller les rattrape et les traduit en réponse HTTP (un 404, un message flash). L'intention reste lisible : le service dit « ce call n'existe pas », il ne renvoie pas un null que l'appelant devrait deviner.`,
          code: `try {
    $relances->reserverCall($id, $dto);
} catch (ProspectIntrouvable $exception) {
    throw $this->createNotFoundException($exception->getMessage());
}`,
          lang: `php`,
        },
        {
          heading: `Analyse statique et environnement reproductible`,
          body: `alda-support embarque PHPStan (phpstan.dist.neon) et une suite PHPUnit, lancés avant chaque livraison. L'application tourne dans Docker avec FrankenPHP et PostgreSQL 16 : un make db, un make seed, et l'environnement est identique partout — ce qui évite le classique « ça marche sur ma machine ». La stack est actuelle : Symfony 7.4, PHP 8.4.`,
        },
      ],
      highlight: `PHPStan + PHPUnit + Docker/PostgreSQL : l'architecture est vérifiée par des outils, pas seulement par bonne volonté.`,
    },
  ],
};

export const LAB_EN: LabPage = {
  title: 'Lab',
  lede: `Four back-end architecture decisions, taken from my Symfony projects. The code shown runs in production.`,
  back: 'Back to the portfolio',
  studies: [
    {
      title: `A request's path: DTO → Controller → Service → Repository`,
      intro: `The rule I hold myself to: a controller decides nothing. It turns an HTTP request into a business intent, delegates, then turns the result back into a response. All the logic lives in a service layer, behind an interface.`,
      sections: [
        {
          heading: `The controller only routes`,
          body: `This alda-support controller is single-action (invokable), final, and depends on interfaces — never on a concrete implementation. It validates the form, calls the service, and picks the response based on context (a Turbo Stream fragment or a plain redirect). No business rule here: booking the call is the service's job.`,
          code: `#[Route('/prospects/{id<\\d+>}/reserver-call', name: 'app_relance_reserver_call', methods: ['POST'])]
final class ReserverCallController extends AbstractController
{
    public function __invoke(
        int $id,
        Request $request,
        RelanceServiceInterface $relances,
        ProspectFicheViewProviderInterface $ficheProvider,
    ): Response {
        $dto = new ReserverCallDTO();
        $form = $this->createForm(ReserverCallType::class, $dto);
        $form->handleRequest($request);

        if (!$form->isSubmitted() || !$form->isValid()) {
            return $this->render('relance/_mini_form_call.html.twig', [
                'form' => $form,
            ], new Response(status: Response::HTTP_UNPROCESSABLE_ENTITY));
        }

        $relances->reserverCall($id, $dto);
        // … then Turbo Stream or redirect depending on context.
    }
}`,
          lang: `php`,
        },
        {
          heading: `The service depends on abstractions, not Doctrine`,
          body: `The repository is defined by an interface: the service talks to CallRepositoryInterface, never to the concrete Doctrine repository. This dependency inversion makes the service testable without a database, and if storage ever changes, the contract holds. The methods carry domain names (trouver, planifiesEntre, sauvegarder), not framework ones.`,
          code: `interface CallRepositoryInterface
{
    public function trouver(int $id): ?Call;

    /**
     * Calls scheduled within [debut, fin) with no result recorded yet.
     *
     * @return list<Call>
     */
    public function planifiesEntre(\\DateTimeImmutable $debut, \\DateTimeImmutable $fin): array;

    public function sauvegarder(Call $call): void;
}`,
          lang: `php`,
        },
      ],
      highlight: `A final, invokable controller that injects only interfaces: the controller's test never touches the database.`,
    },
    {
      title: `Organized by domain, not by technical type`,
      intro: `Most Symfony projects file everything by layer: a Controller/ folder, an Entity/ folder, a Repository/ folder. I did the opposite: I file by business domain, and each domain holds its own full stack.`,
      sections: [
        {
          heading: `Each domain is self-contained`,
          body: `In alda-support, src/ has no global Controller/ folder. It has domains — Call, Infopreneur, Prospect, Relance, Vente — and each carries its chain: Dto, Controller, Service (+ Interface), Repository (+ Interface), Entity, Enum, Exception, View/Provider. Opening one folder shows everything about a business concept, with no jumping between seven directories.`,
          code: `src/Call/
├── Controller/      ReserverCallController, CallResultatController
├── Dto/             ReserverCallDTO, ResultatCallDTO
├── Entity/          Call
├── Enum/            ResultatCall
├── Exception/       CallIntrouvable
├── Form/            ReserverCallType, ResultatCallType
├── Provider/        CallResultatViewProvider (+ Interface)
├── Repository/      CallRepository (+ Interface)
├── Service/         CallService (+ Interface)
└── View/            CallDuJourView, CallResultatView`,
          lang: `text`,
        },
        {
          heading: `What it changes in practice`,
          body: `A business change — "add a payment plan" — touches a single folder. Boundaries between domains are explicit: when the Call domain needs the Prospect domain, it goes through an exposed interface (ProspectFicheViewProviderInterface), not through direct access to its entities. It's Clean Architecture applied to a real CRM, not a blog example.`,
        },
      ],
      highlight: `Five business domains, each with its full Dto → Controller → Service → Repository stack. You read the business in the folder tree.`,
    },
    {
      title: `Two validation boundaries: input on the DTO, invariants in the domain`,
      intro: `A Doctrine entity should never be filled straight from a form. Validation happens at two levels: the DTO checks the shape of the input, the service protects the business rules. It's not one or the other — it's defense in depth.`,
      sections: [
        {
          heading: `First boundary: the DTO validates the input`,
          body: `This alda-support DTO captures a call's result. Simple constraints are attributes (#[Assert\\Positive]), but the real value is contextual validation: an amount is required only if the result is "Sold", a follow-up date only for a "Follow-up". This validation fires in the controller, through isValid(), before the service is even called — the domain never receives malformed input.`,
          code: `final class ResultatCallDTO
{
    #[Assert\\NotNull(message: 'Comment ça s\\'est terminé ?')]
    public ?ResultatCall $resultat = null;

    #[Assert\\Positive(message: 'Le montant vendu doit être positif.')]
    public ?int $montant = null;

    #[Assert\\Callback]
    public function validerSelonResultat(ExecutionContextInterface $context): void
    {
        if (ResultatCall::Vendu === $this->resultat && null === $this->montant) {
            $context->buildViolation('Indique le montant vendu.')
                ->atPath('montant')->addViolation();
        }
    }
}`,
          lang: `php`,
        },
        {
          heading: `Second boundary: the domain protects its invariants`,
          body: `A well-formed input is not a legitimate action. These rules — you don't record a call's result twice, you don't sell without an active offer — can't live on the DTO: they depend on the state of the system, not on the form. The service checks them and throws typed business exceptions, visible right in the contract. The DTO doesn't trust the user; the domain doesn't trust the caller.`,
          code: `interface CallServiceInterface
{
    /**
     * Records a call's result and runs the matching workflow:
     * SOLD → Sale + payment schedule · FOLLOW_UP → status + mandatory follow-up ·
     * NO_SHOW → status + auto follow-up tomorrow 9am.
     *
     * @throws \\App\\Call\\Exception\\CallIntrouvable
     * @throws \\App\\Vente\\Exception\\VenteImpossibleSansOffre
     * @throws \\DomainException if the result was already recorded
     */
    public function enregistrerResultat(int $callId, ResultatCallDTO $dto): Call;
}`,
          lang: `php`,
        },
      ],
      highlight: `"Amount required if sold" lives on the DTO; "no result recorded twice" lives in the service. Two boundaries, two responsibilities.`,
    },
    {
      title: `What surrounds the code: tests, quality, reproducibility`,
      intro: `Clean architecture only matters if it lasts. On my Symfony projects, tooling isn't an afterthought.`,
      sections: [
        {
          heading: `Business exceptions, not return codes`,
          body: `The domain reports errors through typed, named exceptions — CallIntrouvable, VenteImpossibleSansOffre — not through nulls or booleans. The controller catches them and translates them into an HTTP response (a 404, a flash message). Intent stays readable: the service says "this call doesn't exist", it doesn't return a null the caller has to guess.`,
          code: `try {
    $relances->reserverCall($id, $dto);
} catch (ProspectIntrouvable $exception) {
    throw $this->createNotFoundException($exception->getMessage());
}`,
          lang: `php`,
        },
        {
          heading: `Static analysis and a reproducible environment`,
          body: `alda-support ships PHPStan (phpstan.dist.neon) and a PHPUnit suite, run before every delivery. The app runs in Docker with FrankenPHP and PostgreSQL 16: a make db, a make seed, and the environment is identical everywhere — which kills the classic "works on my machine". The stack is current: Symfony 7.4, PHP 8.4.`,
        },
      ],
      highlight: `PHPStan + PHPUnit + Docker/PostgreSQL: the architecture is checked by tools, not just by good intentions.`,
    },
  ],
};
