/**
 * Created by User on 17/07/2018.
 */
var configFilePath = '../../Vendor_configEx.json'
var vendorServerUrl = 'ws://'
var mapMarkersJson =
{
  'mapMarker1': {
    'cordX': '54.25',
    'cordY': '18.59',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker2': {
    'cordX': '69.70',
    'cordY': '34.10',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker3': {
    'cordX': '84.24',
    'cordY': '75.26',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker4': {
    'cordX': '53.88',
    'cordY': '79.63',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker5': {
    'cordX': '53.77',
    'cordY': '77.80',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker6': {
    'cordX': '49.24',
    'cordY': '63.26',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker7': {
    'cordX': '58.24',
    'cordY': '61.62',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker8': {
    'cordX': '44.99',
    'cordY': '54.80',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker9': {
    'cordX': '49.23',
    'cordY': '52.26',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker10': {
    'cordX': '53.72',
    'cordY': '62.16',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker11': {
    'cordX': '60.88',
    'cordY': '53.70',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker12': {
    'cordX': '49.24',
    'cordY': '35.26',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker13': {
    'cordX': '87.57',
    'cordY': '79.63',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker14': {
    'cordX': '60.24',
    'cordY': '45.86',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker15': {
    'cordX': '63.24',
    'cordY': '47.40',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker16': {
    'cordX': '69.54',
    'cordY': '52.26',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker17': {
    'cordX': '79.04',
    'cordY': '49.05',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker18': {
    'cordX': '84.16',
    'cordY': '35.36',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker19': {
    'cordX': '50.54',
    'cordY': '24.16',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker20': {
    'cordX': '56.94',
    'cordY': '25.26',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker21': {
    'cordX': '62.54',
    'cordY': '29.96',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker22': {
    'cordX': '78.34',
    'cordY': '38.66',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker23': {
    'cordX': '84.24',
    'cordY': '29.26',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker24': {
    'cordX': '68.48',
    'cordY': '38.88',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker25': {
    'cordX': '69.24',
    'cordY': '18.26',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker26': {
    'cordX': '83.14',
    'cordY': '25.56',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker27': {
    'cordX': '75.64',
    'cordY': '25.66',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker28': {
    'cordX': '26.94',
    'cordY': '93.96',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker29': {
    'cordX': '29.84',
    'cordY': '80.86',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker30': {
    'cordX': '27.34',
    'cordY': '62.86',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker31': {
    'cordX': '21.30',
    'cordY': '44.70',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker32': {
    'cordX': '15.19',
    'cordY': '31.71',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker33': {
    'cordX': '2.99',
    'cordY': '33.26',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker34': {
    'cordX': '37.94',
    'cordY': '22.26',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker35': {
    'cordX': '33.36',
    'cordY': '6.03',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker36': {
    'cordX': '16.87',
    'cordY': '40.96',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker37': {
    'cordX': '36.29',
    'cordY': '8.11',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker38': {
    'cordX': '34.54',
    'cordY': '21.66',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker39': {
    'cordX': '7.35',
    'cordY': '29.09',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker40': {
    'cordX': '29.52',
    'cordY': '68.40',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker41': {
    'cordX': '16.76',
    'cordY': '36.78',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker42': {
    'cordX': '91.57',
    'cordY': '32.02',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker43': {
    'cordX': '56.60',
    'cordY': '32.02',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker44': {
    'cordX': '18.51',
    'cordY': '21.00',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  },
  'mapMarker45': {
    'cordX': '91.79',
    'cordY': '22.45',
    'icon': 'images/UnActiveIcon.png',
    'modal': {
      'title': '',
      'content': ''
    },
    'markerUrl': ''
  }

}
