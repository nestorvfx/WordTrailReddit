import * as THREE from './three.js/three.module.min.js';
import { Line2 } from './three.js/lines/Line2.js';
import { LineMaterial } from './three.js/lines/LineMaterial.js';
import { LineGeometry } from './three.js/lines/LineGeometry.js';

class App {
    constructor() {
        //SET MAIN SCENE VARIABLES

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xEC0B43/* 0xFF4500 #EB5E55 #32fc86 #5EEB5B #04E762*/);

        let camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 7;

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(renderer.domElement);

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        //END MAIN SCENE VARIABLES


        //SET GAME VARIABLES

        let categoryCode = '';
        let createdBy = '';
        let categoryTitle = '';
        let categoryNumOfPlays = '';
        let categoryHighScore = '';
        let categoryHSByUsername = '';
        let categoryHSByID = '';
        let categoryPostID = '';
        let wordsString = '';

        let username = '';
        let userID = '';
        let userAllowedToCreate = false;

        let categoriesList = [];

        let currentCategoriesCursor = 0;
        let allCategoriesReceived = false;

        let currentWords = ['REDDITTESTI', 'NARUTO', 'MIHAJLO'];

        const lettersPositions = [
            // A
            new THREE.Vector3(-0.1935368776321411, -0.1925322711467743, 0.0),
            new THREE.Vector3(-0.10261392593383789, 0.12739624083042145, 0.0),
            new THREE.Vector3(0.030547022819519043, 0.31640368700027466, 0.0),
            new THREE.Vector3(0.16702759265899658, 0.08074472844600677, 0.0),
            new THREE.Vector3(0.22804474830627441, -0.21911866962909698, 0.0),
            new THREE.Vector3(0.18246829509735107, -0.11467278003692627, 0.0),
            new THREE.Vector3(0.13689184188842773, -0.010226890444755554, 0.0),
            new THREE.Vector3(-0.0962834358215332, 0.008945867419242859, 0.0),
            new THREE.Vector3(-0.3340641260147095, 0.004965201020240784, 0.0),

            // B
            new THREE.Vector3(-0.16292834281921387, -0.2420939952135086, 0.0),
            new THREE.Vector3(-0.15509557723999023, -0.006944805383682251, 0.0),
            new THREE.Vector3(-0.14393830299377441, 0.22632962465286255, 0.0),
            new THREE.Vector3(0.011106491088867188, 0.2540339529514313, 0.0),
            new THREE.Vector3(0.14724397659301758, 0.15353411436080933, 0.0),
            new THREE.Vector3(0.07491135597229004, 0.020449191331863403, 0.0),
            new THREE.Vector3(-0.12178301811218262, -0.014212310314178467, 0.0),
            new THREE.Vector3(0.07308650016784668, -0.004701942205429077, 0.0),
            new THREE.Vector3(0.15357398986816406, -0.15030831098556519, 0.0),
            new THREE.Vector3(0.04515862464904785, -0.2525482177734375, 0.0),

            // C
            new THREE.Vector3(0.09460687637329102, 0.2664518654346466, 0.0),
            new THREE.Vector3(0.01143193244934082, 0.28975915908813477, 0.0),
            new THREE.Vector3(-0.1237797737121582, 0.27911198139190674, 0.0),
            new THREE.Vector3(-0.2540731430053711, 0.030304431915283203, 0.0),
            new THREE.Vector3(-0.057314395904541016, -0.1988067775964737, 0.0),
            new THREE.Vector3(0.03759193420410156, -0.20610210299491882, 0.0),
            new THREE.Vector3(0.09460687637329102, -0.16082650423049927, 0.0),
            new THREE.Vector3(0.11074256896972656, -0.13917043805122375, 0.0),
            new THREE.Vector3(0.13575220108032227, -0.1450013816356659, 0.0),

            // D
            new THREE.Vector3(0.11412477493286133, 0.18020915985107422, 0.0),
            new THREE.Vector3(0.17703771591186523, 0.03676128387451172, 0.0),
            new THREE.Vector3(0.18375539779663086, -0.12996329367160797, 0.0),
            new THREE.Vector3(0.061792850494384766, -0.2532900273799896, 0.0),
            new THREE.Vector3(-0.17072725296020508, -0.2660594582557678, 0.0),
            new THREE.Vector3(-0.18180513381958008, -0.016022473573684692, 0.0),
            new THREE.Vector3(-0.19288253784179688, 0.23401454091072083, 0.0),
            new THREE.Vector3(-0.03174114227294922, 0.2255508005619049, 0.0),

            // E
            new THREE.Vector3(0.15402889251708984, 0.25079479813575745, 0.0),
            new THREE.Vector3(-0.011486053466796875, 0.26803603768348694, 0.0),
            new THREE.Vector3(-0.11499834060668945, 0.16533896327018738, 0.0),
            new THREE.Vector3(-0.0564112663269043, 0.03538528084754944, 0.0),
            new THREE.Vector3(0.14769840240478516, 0.013417840003967285, 0.0),
            new THREE.Vector3(0.02422618865966797, 0.02468445897102356, 0.0),
            new THREE.Vector3(-0.10233831405639648, -0.002407282590866089, 0.0),
            new THREE.Vector3(-0.10916423797607422, -0.07612040638923645, 0.0),
            new THREE.Vector3(-0.09600830078125, -0.17331871390342712, 0.0),
            new THREE.Vector3(-0.0035729408264160156, -0.25776830315589905, 0.0),
            new THREE.Vector3(0.1730189323425293, -0.23978421092033386, 0.0),

            // F
            new THREE.Vector3(-0.07227849960327148, 0.1880972683429718, 0.0),
            new THREE.Vector3(0.0979013442993164, 0.2149169147014618, 0.0),
            new THREE.Vector3(0.1809229850769043, 0.17543715238571167, 0.0),
            new THREE.Vector3(0.04652595520019531, 0.15771013498306274, 0.0),
            new THREE.Vector3(-0.0881037712097168, 0.14378675818443298, 0.0),
            new THREE.Vector3(-0.06473636627197266, 0.04686513543128967, 0.0),
            new THREE.Vector3(-0.05328845977783203, -0.07143482565879822, 0.0),
            new THREE.Vector3(0.05078411102294922, -0.07950431108474731, 0.0),
            new THREE.Vector3(0.16826295852661133, -0.058774739503860474, 0.0),
            new THREE.Vector3(0.012271881103515625, -0.05470481514930725, 0.0),
            new THREE.Vector3(-0.07227849960327148, -0.12207520008087158, 0.0),
            new THREE.Vector3(-0.065948486328125, -0.21227845549583435, 0.0),
            new THREE.Vector3(-0.059618473052978516, -0.3024817109107971, 0.0),
            new THREE.Vector3(-0.07819652557373047, -0.05475607514381409, 0.0),

            // G
            new THREE.Vector3(0.10390567779541016, 0.2509153485298157, 0.0),
            new THREE.Vector3(-0.044327735900878906, 0.2815810441970825, 0.0),
            new THREE.Vector3(-0.22525691986083984, 0.21926510334014893, 0.0),
            new THREE.Vector3(-0.24526309967041016, -0.03386901319026947, 0.0),
            new THREE.Vector3(-0.06384086608886719, -0.21750830113887787, 0.0),
            new THREE.Vector3(0.047858238220214844, -0.22074756026268005, 0.0),
            new THREE.Vector3(0.13872146606445312, -0.18269304931163788, 0.0),
            new THREE.Vector3(0.1487102508544922, -0.09601137042045593, 0.0),
            new THREE.Vector3(0.1450510025024414, -0.0054517388343811035, 0.0),
            new THREE.Vector3(0.05326557159423828, 0.040168434381484985, 0.0),
            new THREE.Vector3(-0.038519859313964844, -0.011781781911849976, 0.0),

            // H
            new THREE.Vector3(-0.1626453399658203, 0.1743423342704773, 0.0),
            new THREE.Vector3(-0.17408370971679688, 0.15761783719062805, 0.0),
            new THREE.Vector3(-0.17847061157226562, 0.009760946035385132, 0.0),
            new THREE.Vector3(0.011843681335449219, 0.012302398681640625, 0.0),
            new THREE.Vector3(0.1760120391845703, 0.0002658963203430176, 0.0),
            new THREE.Vector3(0.1887826919555664, -0.13363462686538696, 0.0),
            new THREE.Vector3(0.16335201263427734, -0.25293606519699097, 0.0),
            new THREE.Vector3(0.16335201263427734, -0.012394189834594727, 0.0),
            new THREE.Vector3(0.16335201263427734, 0.2281477451324463, 0.0),
            new THREE.Vector3(0.17053508758544922, 0.12549316883087158, 0.0),
            new THREE.Vector3(0.14119720458984375, -0.006064176559448242, 0.0),
            new THREE.Vector3(0.006646156311035156, -0.009162068367004395, 0.0),
            new THREE.Vector3(-0.13416004180908203, 0.009760946035385132, 0.0),
            new THREE.Vector3(-0.1942272186279297, -0.07734490931034088, 0.0),
            new THREE.Vector3(-0.17847061157226562, -0.24027597904205322, 0.0),
            new THREE.Vector3(-0.1690692901611328, -0.033262789249420166, 0.0),

            // I
            new THREE.Vector3(-0.1541271209716797, 0.2522936761379242, 0.0),
            new THREE.Vector3(-0.07846355438232422, 0.3016084134578705, 0.0),
            new THREE.Vector3(0.019949913024902344, 0.28710898756980896, 0.0),
            new THREE.Vector3(0.15573596954345703, 0.23844590783119202, 0.0),
            new THREE.Vector3(0.15604591369628906, 0.2776138484477997, 0.0),
            new THREE.Vector3(0.039549827575683594, 0.2730748951435089, 0.0),
            new THREE.Vector3(-0.021195411682128906, 0.20481833815574646, 0.0),
            new THREE.Vector3(0.024199485778808594, -0.04392686486244202, 0.0),
            new THREE.Vector3(0.02311420440673828, -0.28892555832862854, 0.0),
            new THREE.Vector3(-0.0978231430053711, -0.3282311260700226, 0.0),
            new THREE.Vector3(-0.18894195556640625, -0.3047506809234619, 0.0),
            new THREE.Vector3(-0.026862144470214844, -0.30580419301986694, 0.0),
            new THREE.Vector3(0.1370553970336914, -0.30791568756103516, 0.0),
            new THREE.Vector3(0.06948661804199219, -0.3008045554161072, 0.0),
            new THREE.Vector3(-0.014865875244140625, -0.28892555832862854, 0.0),
            new THREE.Vector3(-0.0006227493286132812, -0.054713696241378784, 0.0),
            new THREE.Vector3(0.013619422912597656, 0.17949816584587097, 0.0),
            new THREE.Vector3(-0.07391548156738281, 0.21619108319282532, 0.0),

            // J
            new THREE.Vector3(-0.141676664352417, -0.18909871578216553, 0.0),
            new THREE.Vector3(-0.11541080474853516, -0.260206937789917, 0.0),
            new THREE.Vector3(0.019739508628845215, -0.21441888809204102, 0.0),
            new THREE.Vector3(0.053795576095581055, -0.028143763542175293, 0.0),
            new THREE.Vector3(0.05138969421386719, 0.1653841733932495, 0.0),
            new THREE.Vector3(0.06528007984161377, 0.2362912893295288, 0.0),
            new THREE.Vector3(0.05455482006072998, 0.2919851243495941, 0.0),

            // K
            new THREE.Vector3(-0.12636184692382812, 0.2832995355129242, 0.0),
            new THREE.Vector3(-0.1407465934753418, 0.09489715099334717, 0.0),
            new THREE.Vector3(-0.07888650894165039, 0.020602405071258545, 0.0),
            new THREE.Vector3(0.04227304458618164, 0.14751887321472168, 0.0),
            new THREE.Vector3(0.15849041938781738, 0.2832995355129242, 0.0),
            new THREE.Vector3(0.17171311378479004, 0.2512247562408447, 0.0),
            new THREE.Vector3(0.1078500747680664, 0.15986359119415283, 0.0),
            new THREE.Vector3(-0.0696554183959961, 0.049147069454193115, 0.0),
            new THREE.Vector3(-0.04090619087219238, -0.02054286003112793, 0.0),
            new THREE.Vector3(0.09763836860656738, -0.13991808891296387, 0.0),
            new THREE.Vector3(0.1363353729248047, -0.24209463596343994, 0.0),
            new THREE.Vector3(0.11013364791870117, -0.21748828887939453, 0.0),
            new THREE.Vector3(0.08885979652404785, -0.1819591522216797, 0.0),
            new THREE.Vector3(-0.046576738357543945, -0.056171298027038574, 0.0),
            new THREE.Vector3(-0.12636184692382812, -0.07751333713531494, 0.0),
            new THREE.Vector3(-0.12477922439575195, -0.1550564169883728, 0.0),
            new THREE.Vector3(-0.12319684028625488, -0.23259949684143066, 0.0),

            // L
            new THREE.Vector3(-0.05785703659057617, 0.21509650349617004, 0.0),
            new THREE.Vector3(-0.03316211700439453, 0.22691431641578674, 0.0),
            new THREE.Vector3(-0.0008866786956787109, 0.2277565896511078, 0.0),
            new THREE.Vector3(-0.020853281021118164, 0.1636236310005188, 0.0),
            new THREE.Vector3(-0.048361778259277344, 0.09799063205718994, 0.0),
            new THREE.Vector3(-0.05904126167297363, -0.09213799238204956, 0.0),
            new THREE.Vector3(-0.05152702331542969, -0.27864742279052734, 0.0),
            new THREE.Vector3(0.07253861427307129, -0.28240543603897095, 0.0),
            new THREE.Vector3(0.19851016998291016, -0.2754824161529541, 0.0),

            // M
            new THREE.Vector3(-0.24995708465576172, -0.21019411087036133, 0.0),
            new THREE.Vector3(-0.2211894989013672, 0.029535114765167236, 0.0),
            new THREE.Vector3(-0.20564651489257812, 0.2677246928215027, 0.0),
            new THREE.Vector3(-0.13149070739746094, 0.04446887969970703, 0.0),
            new THREE.Vector3(-0.037900447845458984, -0.17221379280090332, 0.0),
            new THREE.Vector3(0.11904430389404297, 0.0471116304397583, 0.0),
            new THREE.Vector3(0.2374567985534668, 0.25506460666656494, 0.0),
            new THREE.Vector3(0.24100637435913086, 0.013021469116210938, 0.0),
            new THREE.Vector3(0.24062204360961914, -0.22918426990509033, 0.0),

            // N
            new THREE.Vector3(-0.1673893928527832, -0.28080493211746216, 0.0),
            new THREE.Vector3(-0.1558823585510254, -0.08990252017974854, 0.0),
            new THREE.Vector3(-0.15789413452148438, 0.09899812936782837, 0.0),
            new THREE.Vector3(-0.17901611328125, 0.22062918543815613, 0.0),
            new THREE.Vector3(-0.17055416107177734, 0.24775421619415283, 0.0),
            new THREE.Vector3(-0.06489419937133789, 0.06267130374908447, 0.0),
            new THREE.Vector3(0.06682252883911133, -0.10989362001419067, 0.0),
            new THREE.Vector3(0.14623689651489258, -0.2506415843963623, 0.0),
            new THREE.Vector3(0.19342327117919922, -0.2839699983596802, 0.0),
            new THREE.Vector3(0.20046615600585938, 0.02633965015411377, 0.0),
            new THREE.Vector3(0.2757139205932617, 0.32054993510246277, 0.0),

            // O
            new THREE.Vector3(-0.006501674652099609, -0.2737452983856201, 0.0),
            new THREE.Vector3(0.21888399124145508, -0.14501482248306274, 0.0),
            new THREE.Vector3(0.19289541244506836, 0.16619330644607544, 0.0),
            new THREE.Vector3(0.01345205307006836, 0.21367686986923218, 0.0),
            new THREE.Vector3(-0.1774129867553711, 0.16302812099456787, 0.0),
            new THREE.Vector3(-0.23578882217407227, -0.08999931812286377, 0.0),

            // P
            new THREE.Vector3(-0.08941888809204102, -0.3437366485595703, 0.0),
            new THREE.Vector3(-0.07071352005004883, -0.12226617336273193, 0.0),
            new THREE.Vector3(-0.08941888809204102, 0.11835694313049316, 0.0),
            new THREE.Vector3(-0.03754901885986328, 0.15307316184043884, 0.0),
            new THREE.Vector3(0.011861801147460938, 0.18798762559890747, 0.0),
            new THREE.Vector3(0.0909872055053711, 0.16108492016792297, 0.0),
            new THREE.Vector3(0.17011356353759766, 0.13418221473693848, 0.0),
            new THREE.Vector3(0.12865734100341797, -0.10749763250350952, 0.0),
            new THREE.Vector3(-0.07992362976074219, -0.13801002502441406, 0.0),

            // Q
            new THREE.Vector3(-0.2355794906616211, 0.2334766387939453, 0.0),
            new THREE.Vector3(-0.06875419616699219, 0.36754757165908813, 0.0),
            new THREE.Vector3(0.12523365020751953, 0.28728199005126953, 0.0),
            new THREE.Vector3(0.1825857162475586, 0.04464906454086304, 0.0),
            new THREE.Vector3(0.03661346435546875, -0.10518109798431396, 0.0),
            new THREE.Vector3(0.061570167541503906, -0.189674973487854, 0.0),
            new THREE.Vector3(0.1157388687133789, -0.2729274034500122, 0.0),
            new THREE.Vector3(0.04568767547607422, -0.2075566053390503, 0.0),
            new THREE.Vector3(-0.0266876220703125, -0.13050127029418945, 0.0),
            new THREE.Vector3(-0.22698307037353516, -0.019636869430541992, 0.0),

            // R
            new THREE.Vector3(-0.12491607666015625, -0.21607434749603271, 0.0),
            new THREE.Vector3(-0.110748291015625, -0.02559816837310791, 0.0),
            new THREE.Vector3(-0.10645389556884766, 0.1637287139892578, 0.0),
            new THREE.Vector3(0.05456829071044922, 0.30379414558410645, 0.0),
            new THREE.Vector3(0.10454845428466797, 0.05295282602310181, 0.0),
            new THREE.Vector3(-0.028913497924804688, 0.01815652847290039, 0.0),
            new THREE.Vector3(-0.05634021759033203, 0.0028399229049682617, 0.0),
            new THREE.Vector3(0.08579730987548828, -0.09950917959213257, 0.0),
            new THREE.Vector3(0.16521167755126953, -0.24244952201843262, 0.0),

            // S
            new THREE.Vector3(-0.09849202632904053, 0.13987624645233154, 0.0),
            new THREE.Vector3(0.02807915210723877, 0.046250343322753906, 0.0),
            new THREE.Vector3(0.1610400676727295, -0.046860337257385254, 0.0),
            new THREE.Vector3(0.08715057373046875, -0.19268250465393066, 0.0),
            new THREE.Vector3(-0.11748218536376953, -0.22726678848266602, 0.0),
            new THREE.Vector3(-0.13805484771728516, -0.20985913276672363, 0.0),
            new THREE.Vector3(-0.15862751007080078, -0.19245147705078125, 0.0),
            new THREE.Vector3(-0.034493446350097656, -0.19874858856201172, 0.0),
            new THREE.Vector3(0.08824455738067627, -0.19561660289764404, 0.0),
            new THREE.Vector3(0.17267894744873047, -0.08594989776611328, 0.0),
            new THREE.Vector3(0.06608951091766357, 0.0354304313659668, 0.0),
            new THREE.Vector3(-0.08810615539550781, 0.10944747924804688, 0.0),
            new THREE.Vector3(-0.12064707279205322, 0.22533202171325684, 0.0),
            new THREE.Vector3(0.003955364227294922, 0.2778571844100952, 0.0),
            new THREE.Vector3(0.16420519351959229, 0.2443220615386963, 0.0),
            new THREE.Vector3(-0.02518153190612793, 0.26031482219696045, 0.0),

            // T
            new THREE.Vector3(-0.220137357711792, 0.11279845237731934, 0.0),
            new THREE.Vector3(-0.009006023406982422, 0.11844313144683838, 0.0),
            new THREE.Vector3(0.20081114768981934, 0.11279845237731934, 0.0),
            new THREE.Vector3(0.129805326461792, 0.10568606853485107, 0.0),
            new THREE.Vector3(-0.008080720901489258, 0.058992981910705566, 0.0),
            new THREE.Vector3(-0.004375934600830078, -0.17105162143707275, 0.0),
            new THREE.Vector3(0.014074563980102539, -0.403100848197937, 0.0),
            new THREE.Vector3(0.014946937561035156, -0.1535426378250122, 0.0),
            new THREE.Vector3(-0.030235767364501953, 0.08114814758300781, 0.0),
            new THREE.Vector3(-0.11461591720581055, 0.11483466625213623, 0.0),

            // U
            new THREE.Vector3(-0.1841273307800293, 0.2308446168899536, 0.0),
            new THREE.Vector3(-0.18115544319152832, 0.041559696197509766, 0.0),
            new THREE.Vector3(-0.16513705253601074, -0.14579343795776367, 0.0),
            new THREE.Vector3(0.009957551956176758, -0.24639928340911865, 0.0),
            new THREE.Vector3(0.17035555839538574, -0.1299682855606079, 0.0),
            new THREE.Vector3(0.17490363121032715, 0.04386913776397705, 0.0),
            new THREE.Vector3(0.17352056503295898, 0.21818459033966064, 0.0),

            // V
            new THREE.Vector3(-0.14503860473632812, 0.1381692886352539, 0.0),
            new THREE.Vector3(-0.1475543975830078, 0.15537071228027344, 0.0),
            new THREE.Vector3(-0.1355433464050293, 0.15082955360412598, 0.0),
            new THREE.Vector3(-0.04059314727783203, -0.11186790466308594, 0.0),
            new THREE.Vector3(0.05435800552368164, -0.37456488609313965, 0.0),
            new THREE.Vector3(0.15226411819458008, -0.11809396743774414, 0.0),
            new THREE.Vector3(0.25058984756469727, 0.1381692886352539, 0.0),

            // W
            new THREE.Vector3(-0.27124977111816406, 0.20157313346862793, 0.0),
            new THREE.Vector3(-0.24403715133666992, 0.18146276473999023, 0.0),
            new THREE.Vector3(-0.23326969146728516, 0.14143764972686768, 0.0),
            new THREE.Vector3(-0.1629009246826172, -0.19659900665283203, 0.0),
            new THREE.Vector3(-0.09084320068359375, -0.2573556900024414, 0.0),
            new THREE.Vector3(-0.022878646850585938, -0.035436391830444336, 0.0),
            new THREE.Vector3(0.04841804504394531, 0.18574798107147217, 0.0),
            new THREE.Vector3(0.12164306640625, -0.05090534687042236, 0.0),
            new THREE.Vector3(0.20350408554077148, -0.2858409881591797, 0.0),
            new THREE.Vector3(0.3002619743347168, -0.053403377532958984, 0.0),
            new THREE.Vector3(0.34909534454345703, 0.19524312019348145, 0.0),

            // X
            new THREE.Vector3(-0.12799072265625, 0.18224787712097168, 0.0),
            new THREE.Vector3(-0.041596412658691406, 0.04750263690948486, 0.0),
            new THREE.Vector3(0.027095317840576172, 0.04298675060272217, 0.0),
            new THREE.Vector3(0.07868385314941406, 0.12493836879730225, 0.0),
            new THREE.Vector3(0.12837600708007812, 0.20756804943084717, 0.0),
            new THREE.Vector3(0.08497190475463867, 0.17133164405822754, 0.0),
            new THREE.Vector3(0.020765304565429688, 0.03665661811828613, 0.0),
            new THREE.Vector3(0.08473968505859375, -0.10919654369354248, 0.0),
            new THREE.Vector3(0.17585182189941406, -0.25136077404022217, 0.0),
            new THREE.Vector3(0.09947061538696289, -0.1261957883834839, 0.0),
            new THREE.Vector3(0.014435291290283203, -0.013983726501464844, 0.0),
            new THREE.Vector3(-0.09214973449707031, -0.08456194400787354, 0.0),
            new THREE.Vector3(-0.1723012924194336, -0.24819576740264893, 0.0),
            new THREE.Vector3(-0.12376976013183594, -0.20196139812469482, 0.0),
            new THREE.Vector3(-0.023545265197753906, -0.042469143867492676, 0.0),
            new THREE.Vector3(-0.10676050186157227, 0.21143412590026855, 0.0),

            // Y
            new THREE.Vector3(-0.20171546936035156, 0.19799435138702393, 0.0),
            new THREE.Vector3(-0.12307929992675781, 0.0917896032333374, 0.0),
            new THREE.Vector3(-0.05612468719482422, -0.04571270942687988, 0.0),
            new THREE.Vector3(0.050060272216796875, -0.006997466087341309, 0.0),
            new THREE.Vector3(0.13377761840820312, 0.17900419235229492, 0.0),
            new THREE.Vector3(0.12566184997558594, 0.15691006183624268, 0.0),
            new THREE.Vector3(0.09579753875732422, 0.09354841709136963, 0.0),
            new THREE.Vector3(0.03227806091308594, -0.006348252296447754, 0.0),
            new THREE.Vector3(-0.018143653869628906, -0.10901319980621338, 0.0),
            new THREE.Vector3(-0.014978408813476562, -0.21187663078308105, 0.0),
            new THREE.Vector3(-0.011814117431640625, -0.31474006175994873, 0.0),

            // Z
            new THREE.Vector3(0.13670635223388672, 0.21633374691009521, 0.0),
            new THREE.Vector3(0.03618621826171875, 0.05406904220581055, 0.0),
            new THREE.Vector3(-0.06902027130126953, -0.10333383083343506, 0.0),
            new THREE.Vector3(-0.10698890686035156, -0.17709994316101074, 0.0),
            new THREE.Vector3(-0.15131092071533203, -0.2331000566482544, 0.0),
            new THREE.Vector3(0.017556190490722656, -0.2259892225265503, 0.0),
            new THREE.Vector3(0.19051170349121094, -0.23943006992340088, 0.0),
            new THREE.Vector3(0.00461578369140625, -0.23342573642730713, 0.0),
            new THREE.Vector3(-0.15447616577148438, -0.2046147584915161, 0.0),
            new THREE.Vector3(-0.0059185028076171875, 0.028000354766845703, 0.0),
            new THREE.Vector3(0.15253162384033203, 0.26380932331085205, 0.0),
            new THREE.Vector3(0.027034759521484375, 0.2928694486618042, 0.0),
            new THREE.Vector3(-0.15447616577148438, 0.25114917755126953, 0.0),
            new THREE.Vector3(0.046558380126953125, 0.28049302101135254, 0.0)
        ];

        const lettersIndices = [
            // A
            new THREE.Vector2(0, 9),
            // B
            new THREE.Vector2(9, 10),
            // C
            new THREE.Vector2(19, 9),
            // D
            new THREE.Vector2(28, 8),
            // E
            new THREE.Vector2(36, 11),
            // F
            new THREE.Vector2(47, 14),
            // G
            new THREE.Vector2(61, 11),
            // H
            new THREE.Vector2(72, 16),
            // I
            new THREE.Vector2(88, 18),
            // J
            new THREE.Vector2(106, 7),
            // K
            new THREE.Vector2(113, 17),
            // L
            new THREE.Vector2(130, 9),
            // M
            new THREE.Vector2(139, 9),
            // N
            new THREE.Vector2(148, 11),
            // O
            new THREE.Vector2(159, 6),
            // P
            new THREE.Vector2(165, 9),
            // Q
            new THREE.Vector2(174, 10),
            // R
            new THREE.Vector2(184, 9),
            // S
            new THREE.Vector2(193, 16),
            // T
            new THREE.Vector2(209, 10),
            // U
            new THREE.Vector2(219, 7),
            // V
            new THREE.Vector2(226, 7),
            // W
            new THREE.Vector2(233, 11),
            // X
            new THREE.Vector2(244, 16),
            // Y
            new THREE.Vector2(260, 11),
            // Z
            new THREE.Vector2(271, 14),
        ];

        let currentWord = 'REDDIT';

        let currentWordIndex = 0;

        let numberArray;

        let xRemapRange = 2;
        let yOffset = 1 * clamp(camera.aspect, 0.9, 1.8);
        let letterScaling = 1.8;
        let radiusScaling = 0;

        let gameStarted = false, particlesAreSetup = false;
        let gameFinished = false;

        const centeringScreen = document.getElementById('centeringScreen');
        const maintenanceOverlay = document.getElementById('maintenanceOverlay');

        const startingScreen = document.getElementById('starting-screen');
        const playButton = document.getElementById('play-button');
        const createCategoryButton = document.getElementById('create-category-button');
        const settingsButton = document.getElementById('settingsButton');
        const startButton = document.getElementById('startButton');

        const timeDisplay = document.getElementById('timeDisplay');
        const wordCount = document.getElementById('wordCount');
        const finalScore = document.getElementById('final-score');
        const highScore = document.getElementById('highScore');
        const formMessage = document.getElementById('formMessage');
        const deleteConfirmationScreen = document.getElementById('deleteConfirmationScreen');

        const categoriesScreen = document.getElementById('categoriesScreen');
        const categoriesDisplay = document.getElementById('rows-wrapper');
        const scrollButtonUp = document.getElementById('scrollButtonUp');
        const scrollButtonDown = document.getElementById('scrollButtonDown');
        const returnToStartButton = document.getElementById('returnToStartButton');
        const retryButton = document.getElementById('retryButton');
        const deleteCategoryButton = document.getElementById('deleteCategoryButton');
        const deleteDataButton = document.getElementById('deleteDataButton');
        const deleteConfirmButton = document.getElementById('confirmButton');
        const deleteCancelButton = document.getElementById('cancelButton');
        const deleteText = document.getElementById('deleteText');

        let typeOfConfirm = 'category';

        let cCategories;

        categoriesDisplay.innerHTML = '';

        const maxWordCount = 12;


        let particleCount;
        let particles = [];
        let trails = [];

        //END SET GAME VARIABLES


        // SET MAIN LOOP VARIABLES

        const clock = new THREE.Clock();
        let totalTime = 0;
        let totalDeltaTime = 0;

        let currentTrailMaxLength = 0;

        const gameLength = 60;

        let guess = '';

        let currentlyTyped = '';

        let selectedCategory = 0;

        let maintenanceTime = false;

        let minutesOffset = isWithin5MinutesOf20thUTC();
        if (0 < minutesOffset && minutesOffset <= 5) {
            maintenanceTime = true;
            const minutesString = Math.round(minutesOffset) == 1 ? ' minute' : ' minutes';
            displayBarMessage('In ~' + Math.round(minutesOffset).toString() + minutesString + ', app will close for database maintenance for 5 minutes.');
        } else {
            setInterval(() => {
                displayBarMessage('In ~5 minutes, app will close for maintenance for 5 minutes.');
            }, Math.max(Math.abs((minutesOffset - 5) * 60000) - 0.05, 1000))
        }

        let diffInMinutes = isWithin5MinutesIn20thUTC();
        if (-0.1 < diffInMinutes && diffInMinutes <= 5) {
            centeringScreen.style.display = 'none';
            maintenanceOverlay.style.display = 'flex';
        } else if (diffInMinutes < 0) {
            setInterval(() => {
                centeringScreen.style.display = 'none';
                maintenanceOverlay.style.display = 'flex';
            }, Math.max(-diffInMinutes * 60000 - 0.05, 1000));
        }

        //END SET MAIN LOOP VARIABLES


        // SETUP KEYBOARD

        const keyboardOutput = document.getElementById('output');
        const keys = document.querySelectorAll('.key');
        const keyboard = document.getElementById('keyboard');

        keys.forEach(key => {
            key.addEventListener('click', () => {
                if (key.classList.contains('space')) {
                    if (currentlyTyped.length < 12) {
                        const letter = document.createElement('div');
                        letter.className = 'output-item';
                        letter.textContent = ' ';
                        currentlyTyped += ' ';
                        keyboardOutput.appendChild(letter);
                    }
                } else if (key.classList.contains('submit')) {
                    guess = currentlyTyped;
                    currentlyTyped = '';
                    keyboardOutput.innerHTML = '';
                } else if (key.classList.contains('backspace')) {
                    currentlyTyped = currentlyTyped.substring(0, currentlyTyped.length - 1);
                    const lastChild = output.lastChild;
                    if (lastChild) keyboardOutput.removeChild(lastChild);
                } else {
                    if (currentlyTyped.length < 12) {
                        const letter = document.createElement('div');
                        letter.className = 'output-item';
                        letter.textContent = key.textContent;
                        currentlyTyped += key.textContent;
                        keyboardOutput.appendChild(letter);
                    }
                }
            });
        });

        //END KEYBOARD SETUP


        function isWithin5MinutesOf20thUTC() {
            const now = new Date();
            return (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 20) - Date.now()) / 60000;
        }

        function isWithin5MinutesIn20thUTC() {
            const now = new Date();
            return (Date.now() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 20)) / 60000;
        }

        // TESTING FUNCTION
        /*function isWithin5MinutesOf20thUTC() {
            return (new Date().setUTCHours(2, 10, 0, 0) - Date.now()) / 60000; // Convert back to minutes, rounded up
        }*/


        // ON MOBILE THIS FUNCTION ASSISTS IN CASES WHERE PARTICLES DO NOT APPEAR / ARE NaN (in position)
        function resetParticles() {
            // Dispose of particle geometries and materials
            particles.forEach(particle => {
                if (particle.geometry) particle.geometry.dispose();
                if (particle.material) particle.material.dispose();
            });

            trails.forEach(trail => {
                if (trail.geometry) trail.geometry.dispose();
                if (trail.material) trail.material.dispose();
            });

            particles = [];
            scene.children = [];
            trails = [];

            if (typeof gc != 'undefined') gc();

            initializeParticles();
        }

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        function remap(value, inMin, inMax, outMin, outMax) {
            return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
        }


        function randomPointInCircle(center, r) {
            const angle = Math.random() * Math.PI * 2;

            const distance = Math.random() * r;

            const x = center.x + distance * Math.cos(angle);
            const y = center.y + distance * Math.sin(angle);

            return new THREE.Vector3(x, y, center.z);
        }


        function setNewWordParticles(newWord) {
            numberArray = Array.from(newWord, c => c.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0));

            for (let p = 0; p < Math.max(newWord.length, particleCount); p++) {
                let opacity = 0;

                if (p < newWord.length && newWord[p] != ' ') {
                    opacity = 1;

                    const xOffset = newWord.length <= 6
                        ? (p - newWord.length / 2 + 0.5) * 0.7 * camera.aspect
                        : remap(
                            (p - newWord.length / 2 + 0.5) * 0.7,
                            (-newWord.length / 2 + 0.5) * 0.7,
                            (newWord.length / 2 - 0.5) * 0.7,
                            -xRemapRange * camera.aspect, xRemapRange * camera.aspect
                        );

                    const letterScalingRemap = remap(
                        newWord.length,
                        1,
                        12,
                        letterScaling * camera.aspect, 1.4 * camera.aspect
                    );
                    particles[p].userData.targetPosition = randomPointInCircle(lettersPositions[lettersIndices[numberArray[p]].x].clone().multiplyScalar(letterScalingRemap).add(new THREE.Vector3(xOffset, yOffset, 0)), clamp(currentWordIndex / 50, 0, 0.4) * radiusScaling);
                } else {
                    particles[p].position.set(0, 0, 0);
                }

                particles[p].material.opacity = opacity;
                particles[p].userData.trail = [
                    particles[p].position.clone(),
                    particles[p].position.clone()
                ];
                const positions = particles[p].userData.trail.flatMap(t => [t.x, t.y, t.z]);
                trails[p].geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                trails[p].material.opacity = opacity;
            }

            currentWord = newWord;
            particleCount = currentWord.length;
        }

        function initializeParticles() {
            for (let i = 0; i < maxWordCount; i++) {
                const geometry = new THREE.SphereGeometry(0.06, 8, 8);
                const rgb = new THREE.Vector3(Math.random(), Math.random(), Math.random());
                rgb.normalize();
                const color = new THREE.Color(rgb.x, rgb.y, rgb.z).addScalar(0.0);

                const material = new THREE.MeshBasicMaterial({
                    color,
                    transparent: true,
                    opacity: (i < particleCount && numberArray[i] != -65),
                    depthWrite: false,
                    depthTest: false
                });

                const particle = new THREE.Mesh(geometry, material);
                particle.renderOrder = 2;


                const velocity = new THREE.Vector3(
                    Math.random() * 0.01 - 0.01,
                    Math.random() * 0.01 + 0.01,
                    Math.random() * 0.01 - 0.01
                );


                let targetPosition = new THREE.Vector3(0, 0, 0);
                if (i < particleCount && currentWord[i] != ' ') {
                    const xOffset = particleCount <= 6
                        ? (i - particleCount / 2 + 0.5) * 0.7 * camera.aspect
                        : remap(
                            (i - particleCount / 2 + 0.5) * 0.7,
                            (-particleCount / 2 + 0.5) * 0.7,
                            (particleCount / 2 - 0.5) * 0.7,
                            -xRemapRange * camera.aspect, xRemapRange * camera.aspect
                        );

                    const letterScalingRemap = remap(
                        particleCount,
                        1,
                        12,
                        letterScaling * camera.aspect, 1.4 * camera.aspect
                    );
                    targetPosition = randomPointInCircle(lettersPositions[lettersIndices[numberArray[i]].x].clone().multiplyScalar(letterScalingRemap).add(new THREE.Vector3(xOffset, yOffset, 0)), clamp(currentWordIndex / 50, 0, 0.4) * radiusScaling);
                    particle.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
                } else {
                    targetPosition = new THREE.Vector3(0, 0, 0);
                }

                particle.userData = { targetPosition, velocity, currentIndex: 0, trail: [] };

                scene.add(particle);
                particles.push(particle);

                const trailMaterial = new LineMaterial({
                    color: color.multiplyScalar(0.95),
                    linewidth: 4,
                    opacity: 1,
                    transparent: true,
                    depthWrite: false,
                    dashed: false,
                    depthTest: false,
                });
                particle.userData.trail = [targetPosition.clone(), targetPosition.clone()];
                const trailGeometry = new LineGeometry();
                trailGeometry.setFromPoints(particle.userData.trail);
                const trailLine = new Line2(trailGeometry, trailMaterial);
                trailLine.computeLineDistances();
                trailLine.scale.set(1, 1, 1);

                scene.add(trailLine);
                trails.push(trailLine);
            }
        }

        function setupStartScreen() {
            gameStarted = false;
            currentWord = 'Word Trail';
            numberArray = Array.from(currentWord).map(c => c.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0));

            particleCount = currentWord.length;

            if (!particlesAreSetup) {
                resetParticles();
            } else {
                setNewWordParticles(currentWord);
                gameFinished = false;
            }
            particlesAreSetup = true;
            update();
        }

        function startGuessingGame() {
            xRemapRange = 2.2;
            yOffset = clamp(1 * camera.aspect, 0.4, 2);
            letterScaling = 4;
            radiusScaling = 1;

            totalTime = 0;

            guess = '';

            currentlyTyped = '';

            currentWordIndex = 0;
            setNewWordParticles(currentWords[currentWordIndex]);

            totalDeltaTime = 0;

            // Timer
            timeDisplay.textContent = '0:00';
            wordCount.textContent = '✅ 0';

            timeDisplay.style.display = 'block';
            wordCount.style.display = 'block';

            gameStarted = true;
            gameFinished = false;

            keyboard.style.display = 'grid';
            keyboardOutput.style.display = 'flex';
        }

        function displayEndScreen(completed) {
            gameFinished = true;
            gameStarted = false;
            if (!completed && totalTime == gameLength) {
                timeDisplay.textContent = '1:00';
            } else {
            }

            //SEND MESSAGE TO UPDATE CATEGORY INFO AND SET NEW HIGH SCORE IF NEEDED
            window.parent.postMessage(
                {
                    type: 'updateCategoryInfo', data: {
                        categoryCode: categoryCode,
                        newScore: currentWordIndex,
                        guessedAll: completed
                    }
                },
                '*'
            );

            letterScaling = 1.5;
            yOffset = 1.2 * clamp(camera.aspect, 0.9, 1.8);
            xRemapRange = 1;
            radiusScaling = 0;

            setNewWordParticles('SCORE');
        }

        function displayCategories(categoriesData, sceneType) {
            if (sceneType == 'userCategoriesRemoveOne') {
                cCategories.splice(selectedCategory, 1);
                categoriesList = cCategories;
                categoriesDisplay.innerHTML = '';
            }
            else if (currentCategoriesCursor == 0 || sceneType == 'userCategories') {
                cCategories = categoriesData.split(';');
                categoriesList = cCategories;
                categoriesDisplay.innerHTML = '';
            } else if (sceneType == 'playCategories') {
                cCategories = categoriesData.split(';');
                categoriesList.push(...cCategories);
            }

            if (!(cCategories == '')) {
                const currentLength = categoriesDisplay.childElementCount;
                for (let c = currentLength; c < categoriesList.length; c++) {
                    const categoryItem = document.createElement("div");
                    categoryItem.className = "list-row";
                    const [cCode, cUser, cTitle, cNOP, cHS, cBH, cPI] = categoriesList[c].split(':');
                    if (c == 0) {
                        categoryItem.classList.add('selected');
                        selectedCategory = 0;
                    }
                    /* WITH LINK
                    categoryItem.innerHTML = "<div class=\"col-title\">" + cTitle + "</div>" +
                        "<div class=\"col-created\">" +
                        (cUser == '[deleted]' ? '[deleted]' : "<a href=\"https://www.reddit.com/u/" + cUser + "\" target=\"_blank\" class=\"links\")>" + cUser + "</a>") +
                        "</div>" + "<div class=\"col-played\">" + cNOP + "</div>" +
                        "<div class=\"col-hs\">" + cHS + "</div>";
                        */
                    categoryItem.innerHTML = "<div class=\"col-title\">" + cTitle + "</div>" +
                        "<div class=\"col-created\">" + cUser + "</div>" +
                        "<div class=\"col-played\">" + cNOP + "</div>" +
                        "<div class=\"col-hs\">" + cHS + "</div>";


                    categoryItem.addEventListener('click', event => {
                        categoriesDisplay.children[selectedCategory].classList.remove('selected');
                        categoryItem.classList.add('selected');
                        [categoryCode, createdBy, categoryTitle, categoryNumOfPlays, categoryHighScore, categoryHSByUsername, categoryHSByID, categoryPostID] = categoriesList[c].split(':');
                        selectedCategory = c;
                    });


                    categoriesDisplay.appendChild(categoryItem);
                }
                //DISPLAY START BUTTON
                startButton.style.borderColor = "#ffffff";
                deleteCategoryButton.style.borderColor = "#ffffff";
                scrollButtonDown.style.display = 'flex';
                scrollButtonUp.style.display = 'flex';
            }
            else {
                const categoryItem = document.createElement('li');
                categoryItem.classList.add('emptyElement');
                categoryItem.innerHTML = "<span class=\"emptyText\">There are currently no available categories.\n(feel free to create one) </span> ";
                categoriesDisplay.appendChild(categoryItem);

                startButton.style.borderColor = "#737373";
                deleteCategoryButton.style.borderColor = "#737373";
                scrollButtonDown.style.display = 'none';
                scrollButtonUp.style.display = 'none';
            }
            returnToStartButton.style.top = '84%';
            returnToStartButton.style.display = 'block';
            categoriesScreen.style.display = 'flex';
            startingScreen.style.display = 'none';
            if (sceneType == 'playCategories') {
                startButton.style.display = 'block';
            } else if (sceneType.startsWith('userCategories')) {
                deleteCategoryButton.style.display = 'block';
            }
            categoriesDisplay.scrollTop = 0;
        }


        // Receive input from blocks with info and setup starting screen
        window.addEventListener('message', (event) => {
            if (event.data.type == 'devvit-message') {
                const message = event.data.data.message;
                if (message.type == 'initialData') {
                    const data = message.data;
                    if (data.username != null && data.username != '') {
                        username = data.username;
                        userID = data.userID;
                        userAllowedToCreate = data.userAllowedToCreate;

                        playButton.addEventListener('click', () => {
                            // In order to refresh list when entering categories again
                            currentCategoriesCursor = 0;
                            allCategoriesReceived = false;
                            categoriesList = [];

                            window.parent.postMessage(
                                { type: 'updateCategories', data: { cursor: currentCategoriesCursor } },
                                '*'
                            );
                        });

                        if (userAllowedToCreate) {
                            createCategoryButton.addEventListener('click', () => {
                                window.parent.postMessage(
                                    { type: 'startForm', data: {} },
                                    '*'
                                );
                                document.body.style.pointerEvents = 'none';
                            });
                        }
                        else {
                            createCategoryButton.style.display = 'none';
                            settingsButton.style.top = '60%';
                        }

                        settingsButton.addEventListener('click', () => {
                            currentCategoriesCursor = 0;
                            allCategoriesReceived = true;
                            categoriesList = [];

                            window.parent.postMessage(
                                { type: 'requestUserData', data: {} },
                                '*'
                            );
                        });

                        startButton.addEventListener('click', () => {
                            if (scrollButtonDown.style.display != 'none') {
                                [categoryCode, createdBy, categoryTitle, categoryNumOfPlays, categoryHighScore, categoryHSByUsername, categoryHSByID] = categoriesList[selectedCategory].split(':');
                                window.parent.postMessage(
                                    { type: 'wordsRequest', data: { categoryCode: categoryCode } },
                                    '*'
                                );
                            }
                        });

                        deleteCategoryButton.addEventListener('click', () => {
                            if (scrollButtonDown.style.display != 'none') {
                                deleteText.textContent = 'Confirm deleting ' + categoryTitle + '  category?';
                                typeOfConfirm = 'category';
                                deleteConfirmationScreen.style.display = 'flex';
                            }
                        });

                        returnToStartButton.addEventListener('click', () => {
                            returnToStartButton.style.display = 'none';
                            retryButton.style.display = 'none';
                            startingScreen.style.display = 'flex';
                            finalScore.style.display = 'none';
                            highScore.style.display = 'none';
                            categoriesScreen.style.display = 'none';
                            deleteDataButton.style.display = 'none';
                            deleteCategoryButton.style.display = 'none';
                            startButton.style.display = 'none';

                            xRemapRange = 2;
                            yOffset = 1 * clamp(camera.aspect, 0.9, 1.8);
                            letterScaling = 1.8;
                            radiusScaling = 0;

                            if (currentWord != 'Word Trail') {
                                setupStartScreen();
                            }
                        });

                        deleteDataButton.addEventListener('click', () => {
                            deleteText.textContent = 'Confirm deleting all of your Reddit info within Word Trail Game itself + category posts created?';
                            typeOfConfirm = 'allData';
                            deleteConfirmationScreen.style.display = 'flex';
                        });

                        deleteConfirmButton.addEventListener('click', () => {
                            if (typeOfConfirm == 'allData') {
                                window.parent.postMessage(
                                    { type: 'deleteAllUserData', data: {} },
                                    '*'
                                );
                            }
                            else if (typeOfConfirm == 'category') {
                                [categoryCode, createdBy, categoryTitle, categoryNumOfPlays, categoryHighScore, categoryHSByUsername, categoryHSByID] = categoriesList[selectedCategory].split(':');
                                window.parent.postMessage(
                                    { type: 'deleteCategory', data: { categoryCode: categoryCode } },
                                    '*'
                                );
                            } else if (typeOfConfirm == 'postHighScore') {

                            }
                            document.body.style.pointerEvents = 'none';
                        });

                        deleteCancelButton.addEventListener('click', () => {
                            deleteConfirmationScreen.style.display = 'none';
                        });

                        retryButton.addEventListener('click', () => {
                            returnToStartButton.style.display = 'none';
                            finalScore.style.display = 'none';
                            highScore.style.display = 'none';
                            categoriesScreen.style.display = 'none';

                            retryButton.style.display = 'none';
                            returnToStartButton.style.display = 'none';
                            categoriesScreen.style.display = 'none';
                            currentWords = currentWords.sort(() => Math.random() - 0.5);
                            startGuessingGame();
                        });

                        scrollButtonUp.addEventListener('click', () => {
                            const firstElement = categoriesDisplay.querySelector('.list-row');
                            if (firstElement) {
                                const elementHeight = firstElement.offsetHeight + parseFloat(getComputedStyle(firstElement).marginBottom);
                                categoriesDisplay.scrollBy({ top: -elementHeight, behavior: 'smooth' });
                            }
                        });

                        scrollButtonDown.addEventListener('click', () => {
                            const firstElement = categoriesDisplay.querySelector('.list-row');
                            if (firstElement) {
                                const elementHeight = firstElement.offsetHeight + parseFloat(getComputedStyle(firstElement).marginBottom);
                                categoriesDisplay.scrollBy({ top: elementHeight, behavior: 'smooth' });
                            }
                        });

                        categoriesDisplay.addEventListener('scroll', () => {
                            const maxScroll = categoriesDisplay.scrollHeight - categoriesDisplay.clientHeight;
                            if (categoriesDisplay.scrollTop >= maxScroll) {
                                scrollButtonDown.disabled = true;

                                if (!allCategoriesReceived) {
                                    window.parent.postMessage(
                                        { type: 'updateCategories', data: { cursor: currentCategoriesCursor } },
                                        '*'
                                    );
                                }
                            } else {
                                scrollButtonDown.disabled = false;
                            }

                            if (categoriesDisplay.scrollTop <= 0) {
                                scrollButtonUp.disabled = true;
                            } else {
                                scrollButtonUp.disabled = false;
                            }
                        });

                        startingScreen.style.display = 'flex';
                    }
                    if (data.postType == 'mainPost') { }
                    else if (data.postType.startsWith('categoryPost')) {
                        [, categoryCode, createdBy, categoryTitle, categoryNumOfPlays, categoryHighScore, categoryHSByUsername, categoryHSByID, categoryPostID, wordsString] = data.postType.split(':');
                        if (categoryCode) {
                            currentWords = wordsString?.split(',').sort(() => Math.random() - 0.5) || [];

                            startButton.style.display = 'none';
                            returnToStartButton.style.display = 'none';
                            categoriesScreen.style.display = 'none';
                            deleteDataButton.style.display = 'none';
                            startingScreen.style.display = 'none';
                            startGuessingGame();
                            /* else {
                                 displayBarMessage('There was an error. Try again');
                             }*/
                        }
                    }
                }
                else if (message.type == 'sendCategories') {
                    displayCategories(message.data.usersCategories, 'playCategories');
                    currentCategoriesCursor = message.data.cursor;
                    if (currentCategoriesCursor == 0) {
                        allCategoriesReceived = true;
                    }
                }
                else if (message.type == 'sendCategoryWords') {
                    if (message.data.words != null && message.data.words != 'error') {
                        startButton.style.display = 'none';
                        returnToStartButton.style.display = 'none';
                        categoriesScreen.style.display = 'none';
                        deleteDataButton.style.display = 'none';
                        currentWords = message.data.words.split(',').sort(() => Math.random() - 0.5);
                        startGuessingGame();
                    }
                    else {
                        displayBarMessage('There was an error. Try again');
                    }
                }
                else if (message.type == 'updateCategoryFeedback') {
                    if (message.data.information != null && message.data.information != '') {
                        let previousHSID = '';

                        categoryNumOfPlays = (Number(categoryNumOfPlays) + 1).toString();

                        if (message.data.information == 'NEWHS') {
                            finalScore.textContent = currentWordIndex + "\n is New High Score!";
                            categoryHighScore = currentWordIndex;
                            categoryHSByUsername = username;
                            if (!(userID == categoryHSByID)) {
                                previousHSID = categoryHSByID;
                                categoryHSByID = userID;
                            }
                        }
                        else if (message.data.information == 'NOTHS') {
                            finalScore.textContent = currentWordIndex;
                            const [previousHSUser, previousHS] = message.data.categoryInfo.split(':');
                            /* WITH LINK
                            highScore.innerHTML = parseInt(previousHS) > 0 ? "High Score<br>" +
                                (previousHSUser == '[deleted]' ? 'by [deleted]:' : "by <a href=\"https://www.reddit.com/u/" + previousHSUser + "\" target=\"_blank\" class=\"links\">" + previousHSUser + "</a>:") +
                                "<br>" +
                                previousHS : 'High Score:<br> 0';*/

                            highScore.innerHTML = parseInt(previousHS) > 0 ? "High Score<br>" + "by " + previousHSUser + ":" + "<br>" + previousHS : 'High Score:<br> 0';


                            highScore.style.display = 'block';
                        }
                    }
                    else {
                        displayBarMessage('There was an error.');
                    }
                    finalScore.style.display = 'block';

                    keyboard.style.display = 'none';
                    keyboardOutput.style.display = 'none';

                    timeDisplay.style.display = 'none';
                    wordCount.style.display = 'none';

                    retryButton.style.display = 'block';

                    returnToStartButton.style.top = '70%';
                    returnToStartButton.style.display = 'block';
                }
                else if (message.type == 'sendUserData') {
                    console.log(message.data.createdCategories);
                    displayCategories(message.data.createdCategories, 'userCategories');
                    deleteDataButton.style.display = 'block';
                }
                else if (message.type == 'formOpened') {
                    if (!message.data.correctly || message.data.correctly == 'false') {
                        displayBarMessage('There was an error starting the creation process. Try again');
                    } else if (message.data.correctly == 'exceeded') {
                        displayBarMessage('You have currently max of 10 active categories. In Settings you can remove them and create space for new.');
                    }
                    document.body.style.pointerEvents = 'all';
                }
                else if (message.type == 'formCorrect') {
                    if (message.type.categoryTitle == '') {
                        displayBarMessage('There was an error. Try again.');
                    }
                    else {
                        displayBarMessage(message.data.categoryTitle + ' has been succesfully created');
                    }
                }
                /* else if (message.type == 'formIncorrect') {
                     if (!message.data.wordsCorrect && !message.data.titleCorrect) {
                         displayBarMessage('Both fields have been incorrectly submitted');
                     }
                     else if (!message.data.wordsCorrect) { displayBarMessage('Words field has been incorrectly submitted'); }
                     else if (!message.data.titleCorrect) {
                         displayBarMessage('Title field has been incorrectly submitted');
                     }
                 }*/
                else if (message.type == 'categoryDeleted') {
                    if (message.data.deleted) {
                        displayBarMessage('Category has been deleted.');
                        displayCategories('', 'userCategoriesRemoveOne');
                    }
                    else {
                        displayBarMessage('There was an error. Try again, or reach r/nestorvfx');
                    }
                    deleteConfirmationScreen.style.display = 'none';
                    document.body.style.pointerEvents = 'all';
                }
                else if (message.type == 'allDataDeleted') {
                    if (message.data.deleted) {
                        displayBarMessage('Data has been deleted.');
                        displayCategories('', 'userCategories');
                    }
                    else {
                        displayBarMessage('There was an error. Try again, or reach r/nestorvfx');
                    }
                    deleteConfirmationScreen.style.display = 'none';
                    document.body.style.pointerEvents = 'all';
                }
            }
        });

        // Let blocks now webview started
        window.parent.postMessage(
            {
                type: 'webViewStarted', data: {
                }
            },
            '*'
        );

        function displayBarMessage(message) {
            formMessage.textContent = message;
            formMessage.style.display = 'block';
            formMessage.style.opacity = 0.8;

            maintenanceTime = message.endsWith('5 minutes.');
        }

        setupStartScreen();


        //Main Function

        function update() {
            requestAnimationFrame(update);
            if (particlesAreSetup) {

                if (guess != '' && gameStarted && currentWordIndex < currentWords.length) {
                    if (guess == currentWord && totalTime < gameLength) {
                        currentWordIndex += 1;
                        if (currentWordIndex <= currentWords.length - 1) {
                            setNewWordParticles(currentWords[currentWordIndex]);
                        } else {
                            displayEndScreen(true);
                        }

                        guess = '';
                        totalDeltaTime = 0;

                        totalTime = clamp(totalTime - 8, 0, 100);
                        timeDisplay.textContent =
                            Math.floor(totalTime / 60).toString().padStart(1, '0') + ':' +
                            Math.floor(totalTime % 60).toString().padStart(2, '0');
                    } else {
                        guess = '';
                        displayEndScreen(false);
                    }
                }
                else {
                    // 2 delta time variables: One for total time since game started (has to follow real measurement), and
                    // Second one clamped, to prevent if frames glitch for a bit, for particles to go too much further than desired
                    const totalTimeDeltaTime = clock.getDelta();
                    // Clamping to prevent particles going much further than needed if frames glitch for a bit
                    const deltaTime = clamp(totalTimeDeltaTime, 0, 0.03);

                    if (totalTime >= gameLength && gameStarted) {
                        displayEndScreen(false);
                    } else if (totalTime < gameLength && !gameFinished) {
                        if (gameStarted) {
                            totalTime += totalTimeDeltaTime;
                            timeDisplay.textContent =
                                Math.floor(totalTime / 60).toString().padStart(1, '0') + ':' +
                                Math.floor(totalTime % 60).toString().padStart(2, '0');
                            wordCount.textContent = '✅ ' + currentWordIndex.toString();
                            totalDeltaTime += deltaTime * (1 + currentWordIndex / 20);
                        }
                    }

                    for (let i = 0; i < particleCount; i++) {
                        const particle = particles[i];
                        const trailLine = trails[i];

                        if (numberArray[i] != -65) {
                            const indices = lettersIndices[numberArray[i]];
                            let currentIndex = particle.userData.currentIndex;

                            let targetPosition = particle.userData.targetPosition;

                            let velocity = particle.userData.velocity;

                            let currentVelocity = new THREE.Vector3();
                            currentVelocity.copy(targetPosition).sub(particle.position);

                            let distance = currentVelocity.length();
                            if (distance > 0) {
                                if (distance < 0.1) {
                                    if ((currentWordIndex > 3 && ((numberArray[i] + i) % 3 == 0) && radiusScaling == 1) || (numberArray[i] == 3 || numberArray[i] == 14)) {
                                        //Go from last point to firts approach
                                        //Probably a bit trickier to guess
                                        particle.userData.currentIndex = (currentIndex + 1) % indices.y;
                                    }
                                    else {
                                        // APPROACH TO GO BACK AROUND LETTER THE SAME WAY
                                        if (currentIndex >= indices.y - 1) {
                                            particle.userData.currentIndex = -indices.y + 1;
                                        } else {
                                            particle.userData.currentIndex = currentIndex + 1;
                                        }
                                    }

                                    const xOffset = particleCount <= 6
                                        ? (i - particleCount / 2 + 0.5) * 0.7 * camera.aspect
                                        : remap(
                                            (i - particleCount / 2 + 0.5) * 0.7,
                                            (-particleCount / 2 + 0.5) * 0.7,
                                            (particleCount / 2 - 0.5) * 0.7,
                                            -xRemapRange * camera.aspect, xRemapRange * camera.aspect
                                        );

                                    const letterScalingRemap = remap(
                                        particleCount,
                                        1,
                                        12,
                                        letterScaling * camera.aspect, 1.4 * camera.aspect
                                    );

                                    // As more guesses are correct, increasing new point radius (with clamp) to make it more unpredictable/wiggly potentially
                                    particle.userData.targetPosition = randomPointInCircle(lettersPositions[indices.x + Math.abs(particle.userData.currentIndex)].clone().multiplyScalar(letterScalingRemap).add(new THREE.Vector3(xOffset, yOffset, 0)), clamp(currentWordIndex / 50, 0, 0.4) * radiusScaling);
                                }
                                currentVelocity.normalize().multiplyScalar((1 + currentWordIndex / 20) * (1.8 - (1 - radiusScaling) * 0.7) * deltaTime * camera.aspect);
                            }

                            let velocityNew = new THREE.Vector3(0, 0, 0);
                            velocityNew.lerpVectors(velocity, currentVelocity, 0.19 + currentWordIndex / 100 + particleCount / 140 + 0.02 * (1 - radiusScaling));

                            particle.userData.velocity = velocityNew;
                            particle.position.add(velocityNew);

                            particle.userData.trail.push(particle.position.clone());

                            if (particle.userData.trail.length > 5 * camera.aspect * clamp(totalDeltaTime + 30 * (1 - radiusScaling), 0.5, 30)) {
                                particle.userData.trail.shift();
                            }

                            if (trailLine.geometry) {
                                trailLine.geometry.dispose();
                            }
                            const trailGeometry = new LineGeometry();
                            trailGeometry.setFromPoints(particle.userData.trail);
                            trailLine.geometry = trailGeometry;
                            //  const positions = trailLine.geometry.attributes.position.array;

                            //trailLine.computeLineDistances();
                        }
                        if (i == 0) {

                            if (isNaN(particles[0].position.x) || isNaN(particles[0].position.y) || isNaN(particles[0].position.z)) {
                                resetParticles();
                            }
                        }
                    }
                }
            } else {
            }

            // Fade out Form Message
            if (formMessage.style.opacity > 0 && !maintenanceTime) {
                formMessage.style.opacity = clamp(formMessage.style.opacity - clamp((0.802 - formMessage.style.opacity) * 0.02, 0, 0.02), 0, 1);
                if (formMessage.style.opacity == 0) {
                    minutesOffset = isWithin5MinutesOf20thUTC();
                    if (0 < minutesOffset && minutesOffset <= 5) {
                        const minutesString = Math.round(minutesOffset) == 1 ? ' minute' : ' minutes';
                        displayBarMessage('In ~' + Math.round(minutesOffset).toString() + minutesString + ', app will close for maintenance for 5 minutes.');
                    } else {
                        formMessage.style.display = 'none';
                    }
                }
            } else if (maintenanceTime) {
                minutesOffset = isWithin5MinutesOf20thUTC();
                const minutesString = Math.round(minutesOffset) == 1 ? ' minute' : ' minutes';
                displayBarMessage('In ~' + Math.round(minutesOffset).toString() + minutesString + ', app will close for maintenance for 5 minutes.');
            }

            renderer.render(scene, camera);
        }
    }
}

new App();