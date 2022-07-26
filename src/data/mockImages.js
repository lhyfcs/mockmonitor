

export const defaultImage = {
  id: 'cpu1',
  title: {
    text: 'CPU使用率'
  },
  xAxis: [
    {
      type: 'category',
      boundaryGap: false,
      data: []
    }
  ],
  yAxis: [
    {
      type: 'value',
      max: 100,
      axisLabel: {
        formatter: '{value} %'
      }
    }
  ],
  series: [
    {
      type: 'liquidFill',
      data: [0.6]
    }
  ]
}

function newImage() {
  return JSON.parse(JSON.stringify(defaultImage));
}
export function generateImages(count) {
  const images = Array(count).fill({}).map(() => newImage());
  images.forEach((image, index) => image.id = `cpu${index}`);
  return images;
}


export function rnd(low, high, pre) {
  const update = Math.floor(Math.random() * (high - low + 1) + low) * (Math.random() * 2 < 1 ? -1 : 1) / 100;
  pre += update;
  if (pre < 0.05) pre += 0.05;
  if (pre > 1) pre += 0.05;
  return pre; 
}

const reducePercent = 0.4;
const increasePercent = 0.9;

function autoscalingImages(app) {
  // validate each image cpu status, if 
  const { selectService: { images: { optionsGo, optionsNode}}} = app;
  let scaleUp = optionsGo.some((option) => option.series[0].data[0] > increasePercent) 
    || optionsNode.some((option) => option.series[0].data[0] > increasePercent);
  let scaleDown = optionsGo.some((option) => option.series[0].data[0] < reducePercent) 
  || optionsNode.some((option) => option.series[0].data[0] < reducePercent);
  const { selectService: { maxCount, changePercent, flowRate } } = app;
  const maxGo = Math.floor(changePercent * maxCount / 100);
  const maxNode = Math.floor((100 - changePercent) * maxCount / 100);
  const goUsePercent = maxGo === 0? 0 : optionsGo.length / maxGo;
  const nodeUsePercent = maxNode === 0? 0 : optionsNode.length / maxNode;
  let needUpdate = false;
  if (scaleUp) {
    if (goUsePercent > nodeUsePercent && optionsNode.length < maxNode) {
      optionsNode.push(newImage());
      needUpdate = true;
    } else if (goUsePercent < nodeUsePercent && optionsGo.length < maxGo){
      optionsGo.push(newImage());
      needUpdate = true;
    } else if (optionsNode.length < maxNode) {
      optionsNode.push(newImage());
      needUpdate = true;
    } else if (optionsGo.length < maxGo) {
      optionsGo.push(newImage());
      needUpdate = true;
    }
  } else if (scaleDown) {
    if (goUsePercent > nodeUsePercent && optionsGo.length > 0) {
      optionsGo.shift();
      needUpdate = true;
    } else if (goUsePercent < nodeUsePercent && optionsNode.length > 0) {
      optionsNode.shift();
      needUpdate = true;
    } else if (optionsNode.length > 0) {
      optionsNode.shift();
      needUpdate = true;
    } else if (optionsGo.length > 0) {
      optionsGo.shift();
      needUpdate = true;
    }
  }
  if (needUpdate && (optionsGo.length !== 0 || optionsNode.length !== 0)) {
    const average = 0.8 * maxCount * flowRate / 100 / (optionsGo.length + optionsNode.length);
    optionsGo.forEach((image) => {
      image.series[0].data = [rnd(1, 5, average)];
    });
    optionsNode.forEach((image) => {
      image.series[0].data = [rnd(1, 5, average)];
    });
  }
}

export function connectComponent(app) {
  const updateCPUPercent = () => {
    app.selectService.images.optionsGo.forEach((option) => {
      option.series[0].data = [rnd(1, 5, option.series[0].data[0])];
    });
    app.selectService.images.optionsNode.forEach((option) => {
      option.series[0].data = [rnd(1, 5, option.series[0].data[0])];
    });
    autoscalingImages(app);
  };
  window.setInterval(updateCPUPercent.bind(app), 1000);
}


function generateNewImages(preImages, service, average, usePercent) {
  let increaseCount = 0;
  let decreaseCount = 0;
  preImages.forEach((image) => {
    image.series[0].data = [rnd(1, 5, average)];
    if (image.series[0].data[0] < reducePercent) {
      decreaseCount++;
    } else if (image.series[0].data[0] > increasePercent) {
      increaseCount++;
    }
  });
  const maxImage = Math.round(usePercent * service.maxCount);
  // each time only increase or reduce on machine
  if (preImages.length > maxImage) {
    preImages.splice(0, preImages.length - maxImage);
  }
  else if (increaseCount > 0 && preImages.length < maxImage) {
    preImages.push(JSON.parse(JSON.stringify(defaultImage)));
  } else if (decreaseCount > 0 && preImages.length > 0) {
    if (maxImage === 0) preImages.length = [];
    if (preImages.length > 0) preImages.shift();
  }

  return preImages;
}

// with change rate and flow rate, update current golang and nodejs service running status
export function updateImages(service) {
  // set max flow is 0.8 * service.maxCount
  const { flowRate } = service; 
  let preGolangImages = service.images.optionsGo;
  let preNodejsImages = service.images.optionsNode;
  let golangCount = preGolangImages.length;
  if (golangCount === 0 && service.changePercent > 0) {
    preGolangImages = [JSON.parse(JSON.stringify(defaultImage))];
    golangCount = 1;
  }
  let nodeCount = preNodejsImages.length; 
  if (nodeCount === 0 && service.changePercent < 100) {
    preNodejsImages = [JSON.parse(JSON.stringify(defaultImage))];
    nodeCount = 1;
  }
  const totalFlow = 0.8 * service.maxCount * flowRate / 100;
  let average = totalFlow / (golangCount + nodeCount);
  preGolangImages = generateNewImages(preGolangImages, service, average, service.changePercent / 100);
  preNodejsImages = generateNewImages(preNodejsImages, service, average, 1 - service.changePercent / 100);
  // update use percent
  average = totalFlow / (preGolangImages.length + preNodejsImages.length);
  preGolangImages.forEach((image) => {
    image.series[0].data = [rnd(1, 5, average)];
  });
  preNodejsImages.forEach((image) => {
    image.series[0].data = [rnd(1, 5, average)];
  });
  service.images.optionsGo = preGolangImages;
  service.images.optionsNode = preNodejsImages;
  return [preGolangImages, preNodejsImages];
}
