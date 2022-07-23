

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

export function generateImages(count) {
  const images = Array(count).fill({}).map(() => JSON.parse(JSON.stringify(defaultImage)));
  images.forEach((image, index) => image.id = `cpu${index}`);
  return images;
}
